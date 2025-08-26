# Root Index Module Documentation

## Overview

The root index module serves as the **main entry point** for the hang library, providing a clean public API that exports all the major modules. It acts as the **facade** that organizes and exposes the library's functionality to consumers. Think of it as the **front door** through which developers access all the streaming, publishing, and watching capabilities.

## Purpose

The index module serves as the **API gateway**, enabling:
- **Organized exports** of all public modules
- **Namespace management** for logical grouping
- **Clean import paths** for library consumers
- **Tree-shaking support** through selective exports
- **Type-safe access** to all functionality

## Export Structure

### Re-exported Dependencies
```typescript
export * as Moq from "@kixelated/moq";
```
**Achieves**: Provides access to the underlying MoQ protocol implementation.
- Includes all transport-level functionality
- Path utilities for broadcast naming
- Core protocol types and interfaces

### Namespaced Exports
Modules exported as namespaces to maintain organization:

```typescript
export * as Catalog from "./catalog";
```
**Achieves**: Access to metadata schemas and validation.
- Type definitions for audio, video, captions, etc.
- Schema validation functions
- Encoding/decoding utilities

```typescript
export * as Container from "./container";
```
**Achieves**: Data packaging and serialization formats.
- Frame encoding/decoding with timestamps
- Position updates for spatial features
- Variable-length integer encoding

```typescript
export * as Preview from "./preview";
```
**Achieves**: Lightweight metadata broadcasting.
- Room information structures
- Member lists and presence
- Low-bandwidth preview data

```typescript
export * as Publish from "./publish";
```
**Achieves**: Complete media broadcasting system.
- Broadcast orchestration
- Audio/video capture and encoding
- Caption generation
- Chat and location features

```typescript
export * as Support from "./support";
```
**Achieves**: Browser capability detection.
- Feature availability checking
- Compatibility testing
- Fallback recommendations

```typescript
export * as Watch from "./watch";
```
**Achieves**: Complete media consumption system.
- Broadcast playback
- Audio/video decoding and rendering
- Caption display
- Multi-track synchronization

### Direct Exports
```typescript
export * from "./connection";
```
**Achieves**: WebTransport connection management.
- Connection class exported directly
- No namespace needed as it's a single primary export

## Notable Absences

The index **intentionally excludes**:
- **Meet module** - Not exported from root, requires explicit import
- **Web components** - Separate imports for tree-shaking (`hang/publish/element`, `hang/watch/element`, `hang/meet/element`)
- **Utility module** - Internal helpers not part of public API
- **Worker files** - Internal implementation details

## Usage Patterns

### Basic Imports
```typescript
import { Connection, Publish, Watch } from "@kixelated/hang";

const connection = new Connection(url);
const broadcast = new Publish.Broadcast(connection);
```

### Selective Imports
```typescript
import { Catalog } from "@kixelated/hang";

const videoInfo: Catalog.Video = {
  track: { name: "video.h264", priority: 1 },
  config: { codec: "avc1.42001e", width: 1280, height: 720 }
};
```

### Type Imports
```typescript
import type { Moq, Catalog } from "@kixelated/hang";

interface MyBroadcast {
  path: Moq.Path.Valid;
  catalog: Catalog.Root;
}
```

### Accessing Sub-modules
```typescript
import { Container } from "@kixelated/hang";

const producer = new Container.FrameProducer(track);
const consumer = new Container.FrameConsumer(track);
```

## Import Organization

The module follows a deliberate organization strategy:

### Hierarchical Structure
```
@kixelated/hang
├── Moq          (Protocol layer)
├── Connection   (Transport layer)
├── Catalog      (Metadata layer)
├── Container    (Serialization layer)
├── Publish      (Production layer)
├── Watch        (Consumption layer)
├── Preview      (Metadata broadcasting)
└── Support      (Compatibility layer)
```

### Separate Entry Points
For tree-shaking optimization:
- Main library: `@kixelated/hang`
- Publish element: `@kixelated/hang/publish/element`
- Watch element: `@kixelated/hang/watch/element`
- Meet element: `@kixelated/hang/meet/element`
- Meet room: `@kixelated/hang/meet`

## Design Principles

1. **Clean API Surface** - Only expose what's necessary
2. **Namespace Organization** - Logical grouping of related functionality
3. **Tree-shaking Support** - Web components as separate imports
4. **Type Safety** - Full TypeScript type exports
5. **Minimal Surface** - Hide implementation details

## Developer Experience

### Discoverable API
```typescript
import * as Hang from "@kixelated/hang";
// IDE shows: Catalog, Connection, Container, Moq, Preview, Publish, Support, Watch
```

### Clear Module Boundaries
```typescript
// Publishing features
Hang.Publish.Broadcast
Hang.Publish.Audio
Hang.Publish.Video

// Watching features
Hang.Watch.Broadcast
Hang.Watch.Audio
Hang.Watch.Video
```

### Consistent Patterns
```typescript
// All major modules follow similar patterns
const publisher = new Hang.Publish.Broadcast(connection);
const watcher = new Hang.Watch.Broadcast(connection);
```

## Future Considerations

The TODO comment suggests `Moq` might be moved:
```typescript
// TODO This should go into MoQ.
export * as Moq from "@kixelated/moq";
```

This indicates potential future refactoring where the MoQ protocol layer might be accessed differently, possibly as a peer dependency rather than re-exported.

## Best Practices for Library Consumers

1. **Import what you need** - Use specific imports for smaller bundles
2. **Use type imports** - Import types separately for better tree-shaking
3. **Avoid deep imports** - Use the public API, not internal paths
4. **Check Support** - Test browser capabilities before using features
5. **Handle connections** - Always manage Connection lifecycle

## Example: Complete Application Setup
```typescript
import { 
  Connection, 
  Publish, 
  Watch, 
  Catalog, 
  Support 
} from "@kixelated/hang";

// Check browser support
const support = new Support.Detector();
if (!support.supported) {
  console.error("Browser not supported:", support.error);
  return;
}

// Setup connection
const connection = new Connection(new URL("wss://relay.example.com"));

// Create publisher
const publisher = new Publish.Broadcast(connection, {
  name: "my-stream",
  audio: { enabled: true },
  video: { enabled: true }
});

// Create watcher
const watcher = new Watch.Broadcast(connection, {
  name: "other-stream",
  enabled: true
});

// Access catalog metadata
watcher.catalog.subscribe((catalog: Catalog.Root | undefined) => {
  if (catalog) {
    console.log("Stream has:", {
      audio: catalog.audio?.length ?? 0,
      video: catalog.video?.length ?? 0
    });
  }
});
```

This root index module provides the foundation for all hang library usage, organizing the complex functionality into a clean, discoverable API.