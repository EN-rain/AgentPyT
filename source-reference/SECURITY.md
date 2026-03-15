# Security Policy

## Scope

This project is a local CLI, MCP server, and skill layer for Dexscreener-based scanning. Security-sensitive areas include:

- local state in `~/.dexscreener-cli/`
- webhook and alert delivery
- MCP tool inputs
- import/export of presets, tasks, and run history

## Reporting

If you find a security issue, do not open a public issue with exploit details.

Report it privately through one of these paths:

- GitHub private security advisory, if enabled for the repository
- direct maintainer contact through the repository profile

Include:

- affected version or commit
- reproduction steps
- impact
- any suggested fix or mitigation

## Response Goals

Best effort:

- acknowledge receipt
- reproduce and assess impact
- patch high-severity issues first
- publish a fix before sharing full technical detail

## Supported Versions

Security fixes are applied on the latest `main` branch first.

## Operational Guidance

- keep the repo updated with `ds update`
- treat `ds update` as a trust-the-repo operation
- avoid importing untrusted state bundles
- review alert destinations before enabling webhook, Discord, or Telegram delivery
