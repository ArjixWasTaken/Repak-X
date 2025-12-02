# IP Address Obfuscation Implementation

## Overview

IP addresses are now obfuscated throughout the P2P sharing system to protect user privacy while maintaining full functionality.

## What Was Changed

### 1. New Module: `ip_obfuscation.rs`

Created a dedicated module with utilities for obfuscating IP addresses:

- **`obfuscate_ip(ip: &str)`** - Obfuscates IPv4 and IPv6 addresses
  - IPv4: `192.168.1.100` → `192.xxx.xxx.xxx [a1b2c3]`
  - IPv6: `2001:0db8:...` → `2001:xxxx:xxxx:... [a1b2c3]`
  - Hash suffix allows identification without revealing full IP

- **`obfuscate_multiaddr(addr: &str)`** - Obfuscates libp2p multiaddresses
  - `/ip4/192.168.1.5/tcp/8080` → `/ip4/192.xxx.xxx.xxx/tcp/8080 [a1b2c3]`
  - Preserves protocol and port information

- **`obfuscate_multiaddrs(addrs: &[String])`** - Batch obfuscation for address lists

- **`is_private_ip(ip: &str)`** - Utility to check if IP is private/local

### 2. Updated `ShareSession` Structure

**File:** `p2p_sharing.rs`

```rust
pub struct ShareSession {
    pub share_code: String,
    pub encryption_key: String,
    
    // Internal use only - not sent to frontend
    #[serde(skip_serializing)]
    pub local_ip: String,
    
    // Safe for display
    pub obfuscated_ip: String,
    
    pub port: u16,
    pub connection_string: String,
    pub active: bool,
}
```

- `local_ip` is now marked with `#[serde(skip_serializing)]` to prevent it from being sent to the frontend
- `obfuscated_ip` is the new field that's safe to display to users

### 3. Updated Logging

**File:** `p2p_libp2p.rs`

All connection and listening logs now show obfuscated addresses:

```rust
// Before:
info!("Listening on: {}", address);
info!("Connected to peer: {} at {}", peer_id, endpoint.get_remote_address());

// After:
let obfuscated = ip_obfuscation::obfuscate_multiaddr(&address.to_string());
info!("Listening on: {}", obfuscated);

let addr = endpoint.get_remote_address().to_string();
let obfuscated = ip_obfuscation::obfuscate_multiaddr(&addr);
info!("Connected to peer: {} at {}", peer_id, obfuscated);
```

### 4. ShareInfo Display Method

**File:** `p2p_libp2p.rs`

Added method to get obfuscated addresses:

```rust
impl ShareInfo {
    /// Get obfuscated addresses for display purposes
    pub fn obfuscated_addresses(&self) -> Vec<String> {
        ip_obfuscation::obfuscate_multiaddrs(&self.addresses)
    }
}
```

## Privacy Protection

### What's Protected

1. **Local IP addresses** - Never exposed in UI or logs
2. **Remote peer addresses** - Shown with obfuscation in logs
3. **Multiaddresses** - libp2p addresses obfuscated while preserving structure
4. **Connection endpoints** - All connection logs use obfuscated addresses

### What's NOT Obfuscated

1. **Peer IDs** - These are public identifiers in libp2p (not IP addresses)
2. **Port numbers** - Needed for connection information
3. **Share codes** - Public identifiers for mod sharing
4. **Internal connection data** - Real IPs still used for actual connections

## How It Works

### Obfuscation Strategy

1. **IPv4 Addresses:**
   - Shows first octet only: `192.xxx.xxx.xxx`
   - Adds SHA256 hash suffix for identification: `[a1b2c3]`
   - Example: `192.168.1.100` → `192.xxx.xxx.xxx [f3a8b1]`

2. **IPv6 Addresses:**
   - Shows first segment only: `2001:xxxx:xxxx:...`
   - Adds hash suffix: `[a1b2c3]`
   - Example: `2001:0db8:85a3:...` → `2001:xxxx:xxxx:... [c4d5e6]`

3. **Hash Generation:**
   - Uses SHA256 of the full IP address
   - Takes first 3 bytes (6 hex characters) for brevity
   - Consistent hash allows matching connections without revealing IP

### Frontend Impact

The frontend will now receive:
- `obfuscated_ip` instead of `local_ip` in ShareSession
- All displayed addresses are privacy-safe
- Connection functionality remains unchanged

## Testing

The module includes unit tests:

```bash
cargo test ip_obfuscation
```

Tests cover:
- IPv4 obfuscation
- IPv6 obfuscation  
- Multiaddress obfuscation
- Private IP detection

## Benefits

1. **Privacy:** User IP addresses are not exposed in logs or UI
2. **Security:** Reduces attack surface by not revealing network topology
3. **Debugging:** Hash suffixes still allow connection tracking
4. **Transparency:** Users can see they're protected without losing functionality

## Future Enhancements

Potential improvements:
- Configurable obfuscation levels (show more/less info)
- Option to completely hide addresses for maximum privacy
- Relay-only mode to avoid direct IP exposure
- VPN/Tor integration for additional anonymity
