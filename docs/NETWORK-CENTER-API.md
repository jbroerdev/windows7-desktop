# Network Center API — canonical V1 contract

Worker 2 owns `network-adapters.mjs`, `scripts/host_network.py`, their tests and this contract. Root owns backend routing, private agent dispatch, installer and deployment. Woker owns network renderers. This is the agreed interface; test/release readiness is reported separately.

## One provider and one protocol

Python `HostNetwork(state_file, allow_changes=False, watchdog=False).execute(action, data)` is the sole Linux snapshot mapper. No raw-inventory/diagnostics protocol and no `hostNetwork` addition in host-command.mjs.

Node exports `createNetworkAdapters({host=requestNetworkHost, aliasStore})`, `createNetworkAliasStore(file)` and `requestNetworkHost(kind, body, {socket=process.env.HOST_AGENT_SOCKET})`. The injectable `host(kind, body)` returns the already normalized Python DTO. Only `snapshot` and `diagnose` are transport-enabled in V1. Requests are POST to `/network/snapshot` or `/network/diagnose` on the private Unix socket. Body is `{owner: actor.id, admin:true}` plus diagnostic fields. These two envelope fields are exclusively server-derived. The dispatcher calls the same HostNetwork.execute for both operations; network mutations must be rejected by the V1 dispatcher.

Per-request Node entry is `service.handle({action,value,actor,authorized})`. Actor is the server-derived personal active admin; reject share, readonly and unauthenticated contexts. `authorized()` synchronously rechecks the current session, active profile and admin role, and is called before/after host/storage awaits and before mutation. Root validates POST `profileId === current personal actor.id` after reading the body, then strips it before handle. It must not forward actor/owner/admin or unknown fields from client JSON.

## Public routes

| Method/path | service action/value after root validation | Supported behavior |
| --- | --- | --- |
| GET /api/network/adapters | snapshot / `{}` | Real host adapter inventory plus global display aliases |
| GET /api/network/adapters/:id | detail / `{adapterId}` | Real host adapter detail; URL-encode the opaque ID |
| POST /api/network/diagnostics | diagnose / `{kind:'ping'|'dns',target}` | Actual bounded Linux ping or DNS lookup |
| POST /api/network/adapter-label | label / `{adapterId,displayName,expectedRevision}` | Persist global web display alias; never OS rename |

Both POST bodies additionally require `profileId` at the HTTP boundary. All four routes require the personal active admin. Reject unknown fields. No public prepare/apply/confirm/rollback/status routes in V1. Alias CAS uses `expectedRevision: data.aliasRevision` (integer), not the snapshot hash. Empty/whitespace alias removes the override. Labels are at most 80 characters and exclude control characters. Stale CAS returns 409. Missing adapter returns 404; malformed input 400; forbidden role 403; absent host socket 503; malformed provider response 502. Preserve root's existing session/profile conflict handling.

## Snapshot and detail DTO

```js
{
  schemaVersion: 1,
  scope: 'host',
  generatedAt: 'ISO-8601 UTC timestamp',
  revision: '64 lowercase hex SHA-256 configuration/topology hash',
  aliasRevision: 0, // integer >= 0, Node overlay only
  internetConnectivity: 'not-tested',
  capabilities: {
    readAdapters: true, diagnose: true, setDisplayName: true,
    configureIpv4: false, enable: false, disable: false,
    networkManagerCheckpoint: false // detected support, not permission to mutate
  },
  adapters: [{
    id: 'opaque identifier', // current provider: ifindex + ':' + MAC without colons
    name: 'eth0', // actual Linux name
    displayName: 'eth0', // Node alias overlay, otherwise actual name
    ifindex: 2,
    mac: '02:00:00:00:00:01', // string or null
    kind: 'ether', // string or null
    adminUp: true, // boolean or null if not reported
    operState: 'UP', // Linux operational state; UNKNOWN if not reported
    mtu: 1500, // integer or null
    addresses: [{family:'inet',local:'192.0.2.10',prefixLength:24,scope:'global'}],
    routes: [{family:'inet',destination:'default',gateway:'192.0.2.1',metric:100}],
    dnsServers: ['192.0.2.53'], // array or null if unavailable
    dnsSource: 'resolvectl', // string or null
    capabilities: {configureIpv4:false,enable:false,disable:false},
    configurationReason: 'NetworkManager-Ethernet/Checkpoint und explizite Hostfreigabe erforderlich.'
  }]
}
```

Address family is `inet` or `inet6`; prefixLength is an integer in 0..32/128; scope is string or null. Route family is inet/inet6; destination/gateway are string or null; metric integer or null. `addresses:[]` means no reported addresses. `routes:null` and `dnsServers:null` mean unavailable; empty arrays mean a successful read returned no entries. MAC, kind, adminUp, MTU and dnsSource may be null. No inferred Internet connectivity, invented Windows domain/network type, speed, duplex, packet counters or activity data. Renderer must treat missing fields as unavailable.

There is NO `capabilityReasons` object. Use per-adapter `configurationReason` (string or null) for configureIpv4/enable/disable controls; top-level capability false hides/disables the respective global action. V1 setDisplayName reflects alias-store availability. Adapter details return `{schemaVersion,scope,generatedAt,revision,aliasRevision,adapter,capabilities}` with the same adapter/global capability shapes. IDs are opaque and may change after OS interface recreation. Revision excludes generatedAt, alias overlay, traffic counters and address lifetimes; aliases have their own revision.

Diagnostic response: `{scope:'host',kind,target,output,exitCode,internetConnectivity:'not-tested'}`. `exitCode` is the actual command exit status. An unreachable ping is a completed diagnostic with nonzero status, not proof of Internet disconnection. Output is plain text, never HTML. Alias response: `{revision,adapterId,displayName:string|null,scope:'web-display-name'}`; refresh inventory afterward.

## Renderer integration

`renderControlPanelNetwork({data,availableTargets,onNavigate,onAction,busy=false,error=null})`, plus `renderControlPanelAdapters` and `renderControlPanelAdapterStatus`, are DOM-only. Root owns fetching, dialogs and profile binding. Navigate via `onNavigate(target,{adapterId}={})` for home/adapter-settings/adapter-details. Actions are `onAction({action:'diagnose',kind,target})` or `{action:'label',adapterId,displayName,expectedRevision:data.aliasRevision}`. Only those two actions are enabled in V1, according to capabilities. No additional UI ownership is delegated by this contract.

## Mutation development boundary

The same Python provider contains isolated experimental prepare/apply/confirm/rollback/status execution paths for NetworkManager Ethernet IPv4/DHCP/DNS/MTU, using cloned connection profiles and manager-owned rollback checkpoints. They remain private-disabled and allow_changes=False in the first deployed package. They are not release-qualified by this contract. Root must not enable them until isolated tests, manager support, rollback/recovery behavior and an explicit subsequent integration gate are demonstrated. Never change the production connection for QA. V1 delivery does not complete the overall network feature goal.
