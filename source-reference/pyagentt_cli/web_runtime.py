from __future__ import annotations

import asyncio
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .client import DexScreenerClient
from .config import DEFAULT_CHAINS, ScanFilters
from .models import HotTokenCandidate, PairSnapshot
from .scanner import HotScanner
from .state import ScanPreset, ScanTask, StateStore
from .task_runner import execute_task_once, select_due_tasks
from .web_config import WebConfig, WebConfigStore

KNOWN_CHAINS: frozenset[str] = frozenset(
    {
        "solana",
        "base",
        "ethereum",
        "bsc",
        "arbitrum",
        "polygon",
        "optimism",
        "avalanche",
    }
)


def parse_chains(raw: list[str] | tuple[str, ...] | None) -> tuple[str, ...]:
    if not raw:
        return DEFAULT_CHAINS
    values = tuple(chain.strip().lower() for chain in raw if chain.strip())
    invalid = [chain for chain in values if chain not in KNOWN_CHAINS]
    if invalid:
        raise ValueError(f"Unsupported chains: {', '.join(invalid)}")
    return values or DEFAULT_CHAINS


def serialize_pair(pair: PairSnapshot) -> dict[str, Any]:
    return {
        "chainId": pair.chain_id,
        "dexId": pair.dex_id,
        "pairAddress": pair.pair_address,
        "pairUrl": pair.pair_url,
        "tokenAddress": pair.base_address,
        "tokenSymbol": pair.base_symbol,
        "tokenName": pair.base_name,
        "quoteSymbol": pair.quote_symbol,
        "priceUsd": pair.price_usd,
        "priceChangeH1": pair.price_change_h1,
        "priceChangeH24": pair.price_change_h24,
        "volumeH24": pair.volume_h24,
        "volumeH6": pair.volume_h6,
        "volumeH1": pair.volume_h1,
        "volumeM5": pair.volume_m5,
        "txnsH1": pair.txns_h1,
        "txnsH24": pair.txns_h24,
        "buysH1": pair.buys_h1,
        "sellsH1": pair.sells_h1,
        "liquidityUsd": pair.liquidity_usd,
        "marketCap": pair.market_cap,
        "fdv": pair.fdv,
        "holdersCount": pair.holders_count,
        "holdersSource": pair.holders_source,
        "ageHours": pair.age_hours,
    }


def serialize_candidate(candidate: HotTokenCandidate) -> dict[str, Any]:
    payload = serialize_pair(candidate.pair)
    payload.update(
        {
            "score": candidate.score,
            "boostTotal": candidate.boost_total,
            "boostCount": candidate.boost_count,
            "hasProfile": candidate.has_profile,
            "discovery": candidate.discovery,
            "tags": list(candidate.tags),
            "analytics": {
                "compressionScore": candidate.analytics.compression_score,
                "breakoutReadiness": candidate.analytics.breakout_readiness,
                "volumeVelocity": candidate.analytics.volume_velocity,
                "txnVelocity": candidate.analytics.txn_velocity,
                "relativeStrength": candidate.analytics.relative_strength,
                "chainBaselineH1": candidate.analytics.chain_baseline_h1,
                "boostVelocityPerMin": candidate.analytics.boost_velocity,
                "momentumHalfLifeMin": candidate.analytics.momentum_half_life_min,
                "momentumDecayRatio": candidate.analytics.momentum_decay_ratio,
                "fastDecay": candidate.analytics.fast_decay,
                "baseScore": candidate.analytics.base_score,
                "riskScore": candidate.analytics.risk_score,
                "riskPenalty": candidate.analytics.risk_penalty,
                "riskFlags": list(candidate.analytics.risk_flags),
                "scoreComponents": dict(candidate.analytics.score_components),
            },
        }
    )
    return payload


@dataclass(slots=True)
class RuntimeState:
    client: DexScreenerClient
    scanner: HotScanner
    cache_ttl_seconds: int


class WebRuntime:
    def __init__(self, base_dir: Path | None = None) -> None:
        self.state_store = StateStore(base_dir=base_dir)
        self.config_store = WebConfigStore(base_dir=self.state_store.base_dir)
        self._runtime: RuntimeState | None = None
        self._lock = asyncio.Lock()
        self._op_lock = asyncio.Lock()

    @property
    def base_dir(self) -> Path:
        return self.state_store.base_dir

    def get_config(self) -> WebConfig:
        return self.config_store.load()

    async def startup(self) -> None:
        await self._ensure_runtime()

    async def shutdown(self) -> None:
        async with self._lock:
            if self._runtime is None:
                return
            await self._runtime.client.aclose()
            self._runtime = None

    async def update_config(self, patch: dict[str, Any]) -> WebConfig:
        updated = self.config_store.update(patch)
        await self._ensure_runtime(force_refresh=True)
        return updated

    async def _ensure_runtime(self, *, force_refresh: bool = False) -> RuntimeState:
        async with self._lock:
            config = self.config_store.load()
            if (
                not force_refresh
                and self._runtime is not None
                and self._runtime.cache_ttl_seconds == config.cache_ttl_seconds
            ):
                return self._runtime
            if self._runtime is not None:
                await self._runtime.client.aclose()
            client = DexScreenerClient(cache_ttl_seconds=config.cache_ttl_seconds)
            scanner = HotScanner(client)
            self._runtime = RuntimeState(
                client=client,
                scanner=scanner,
                cache_ttl_seconds=config.cache_ttl_seconds,
            )
            return self._runtime

    async def scan(self, filters: ScanFilters) -> list[HotTokenCandidate]:
        runtime = await self._ensure_runtime()
        async with self._op_lock:
            return await runtime.scanner.scan(filters)

    async def search(self, query: str, limit: int) -> list[PairSnapshot]:
        runtime = await self._ensure_runtime()
        async with self._op_lock:
            return await runtime.scanner.search(query=query, limit=limit)

    async def inspect_token(self, chain_id: str, token_address: str) -> list[PairSnapshot]:
        runtime = await self._ensure_runtime()
        async with self._op_lock:
            return await runtime.scanner.inspect_token(chain_id=chain_id, token_address=token_address)

    async def runtime_stats(
        self,
        *,
        seed_query: str | None = None,
        chain_id: str | None = None,
        token_address: str | None = None,
    ) -> dict[str, Any]:
        runtime = await self._ensure_runtime()
        async with self._op_lock:
            if seed_query:
                try:
                    await runtime.client.search_pairs(seed_query)
                except Exception:
                    pass
            if chain_id and token_address:
                try:
                    await runtime.client.get_token_pairs(chain_id, token_address)
                except Exception:
                    pass
            return await runtime.client.get_runtime_stats()

    def resolve_scan_filters(
        self,
        *,
        chains: list[str] | None = None,
        limit: int | None = None,
        min_liquidity_usd: float | None = None,
        min_volume_h24_usd: float | None = None,
        min_txns_h1: int | None = None,
        min_price_change_h1: float | None = None,
        preset_name: str | None = None,
    ) -> ScanFilters:
        config = self.config_store.load()
        filters = ScanFilters(
            chains=parse_chains(chains or list(config.default_chains)),
            limit=config.default_limit,
        )
        if preset_name:
            preset = self.state_store.get_preset(preset_name)
            if not preset:
                raise ValueError(f"Preset '{preset_name}' not found")
            filters = preset.to_filters()
        if chains:
            filters.chains = parse_chains(chains)
        if limit is not None:
            filters.limit = max(1, min(100, limit))
        if min_liquidity_usd is not None:
            filters.min_liquidity_usd = max(0.0, min_liquidity_usd)
        if min_volume_h24_usd is not None:
            filters.min_volume_h24_usd = max(0.0, min_volume_h24_usd)
        if min_txns_h1 is not None:
            filters.min_txns_h1 = max(0, min_txns_h1)
        if min_price_change_h1 is not None:
            filters.min_price_change_h1 = min_price_change_h1
        return filters

    def save_preset(self, name: str, filters: ScanFilters) -> ScanPreset:
        if not name.strip():
            raise ValueError("Preset name is required")
        preset = ScanPreset.from_filters(name=name.strip(), filters=filters)
        return self.state_store.save_preset(preset)

    def list_presets(self) -> list[ScanPreset]:
        return self.state_store.list_presets()

    def delete_preset(self, name: str) -> None:
        self.state_store.delete_preset(name)

    def create_task(
        self,
        *,
        name: str,
        preset: str | None,
        filters: dict[str, Any] | None,
        interval_seconds: int | None,
        alerts: dict[str, Any] | None,
        notes: str,
    ) -> ScanTask:
        if preset and not self.state_store.get_preset(preset):
            raise ValueError(f"Preset '{preset}' not found")
        return self.state_store.create_task(
            name=name,
            preset=preset,
            filters=filters,
            interval_seconds=interval_seconds,
            alerts=alerts,
            notes=notes,
        )

    def list_tasks(self, status: str | None = None) -> list[ScanTask]:
        return self.state_store.list_tasks(status=status)

    def get_task(self, task_name_or_id: str) -> ScanTask | None:
        return self.state_store.get_task(task_name_or_id)

    def update_task_status(self, task_name_or_id: str, status: str) -> ScanTask:
        task = self.state_store.get_task(task_name_or_id)
        if not task:
            raise ValueError(f"Task '{task_name_or_id}' not found")
        return self.state_store.update_task_status(task.id, status=status)

    def delete_task(self, task_name_or_id: str) -> None:
        task = self.state_store.get_task(task_name_or_id)
        if not task:
            raise ValueError(f"Task '{task_name_or_id}' not found")
        self.state_store.delete_task(task.id)

    async def run_task_once(self, task_name_or_id: str, fire_alerts: bool = True) -> dict[str, Any]:
        task = self.state_store.get_task(task_name_or_id)
        if not task:
            raise ValueError(f"Task '{task_name_or_id}' not found")
        runtime = await self._ensure_runtime()
        async with self._op_lock:
            return await execute_task_once(
                store=self.state_store,
                scanner=runtime.scanner,
                task=task,
                mode="web-manual",
                fire_alerts=fire_alerts,
                mark_running=False,
                block_on_error=False,
            )

    async def run_due_tasks(self, default_interval_seconds: int, fire_alerts: bool = True) -> dict[str, Any]:
        due = select_due_tasks(
            store=self.state_store,
            task_name_or_id=None,
            all_tasks=True,
            default_interval_seconds=default_interval_seconds,
        )
        runtime = await self._ensure_runtime()
        runs: list[dict[str, Any]] = []
        async with self._op_lock:
            for task in due:
                result = await execute_task_once(
                    store=self.state_store,
                    scanner=runtime.scanner,
                    task=task,
                    mode="web-daemon",
                    fire_alerts=fire_alerts,
                    mark_running=True,
                    block_on_error=True,
                )
                runs.append(result)
        return {"due": len(due), "runs": runs}
