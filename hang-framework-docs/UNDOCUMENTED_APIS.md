# Undocumented APIs in @kixelated/hang

This document reveals the hidden features and undocumented APIs in the hang package that aren't covered in the main documentation. These features were discovered by exploring the codebase and include powerful capabilities like AI-powered object detection and automatic transcription.

## 1. Object Detection (Video Analysis) 🐈

Run YOLO object detection models directly in the browser using Hugging Face Transformers. The system detects objects in video frames and publishes the results as a MoQ track.

### Publishing with Object Detection

```typescript
import { Publish } from "@kixelated/hang"

const publish = new Publish.Broadcast({
    url: "https://relay.example.com",
    name: "my-broadcast",
    video: {
        enabled: true,
        detection: {
            enabled: true,
            interval: 1000,    // Run detection every second (ms)
            threshold: 0.5     // Confidence threshold (0-1)
        }
    }
})

// Access detected objects locally
publish.video.detection.objects.subscribe((objects) => {
    // objects is an array of DetectionObjects
    objects?.forEach(obj => {
        console.log(`Detected ${obj.label} at (${obj.x}, ${obj.y}) with confidence ${obj.score}`)
        // obj.x, obj.y, obj.w, obj.h are normalized coordinates (0-1)
    })
})
```

### Consuming Detection Data

```typescript
import { Watch } from "@kixelated/hang"

const watch = new Watch.Broadcast({
    url: "https://relay.example.com",
    name: "broadcast-name",
    video: { enabled: true }
})

// Create a detection consumer
const detection = new Watch.Detection(watch.broadcast, watch.catalog, {
    enabled: true
})

// Subscribe to detection updates
detection.objects.subscribe((objects) => {
    objects?.forEach(obj => {
        // Draw bounding boxes, trigger events, etc.
        drawBoundingBox(obj.x, obj.y, obj.w, obj.h, obj.label)
    })
})
```

**Note:** Uses the `Xenova/gelan-c_all` YOLO model. The model is downloaded and cached on first use.

## 2. Automatic Captioning (Speech-to-Text) 🗣️

Real-time transcription using OpenAI's Whisper model running entirely in the browser.

### Publishing with Captions

```typescript
const publish = new Publish.Broadcast({
    url: "https://relay.example.com",
    name: "my-broadcast",
    audio: {
        enabled: true,
        captions: {
            enabled: true,
            ttl: 10000  // Caption display duration in ms
        }
    }
})

// Access transcription results locally
publish.audio.captions.text.subscribe(text => {
    console.log("Transcribed:", text)
})

// Voice activity detection
publish.audio.captions.speaking.subscribe(isSpeaking => {
    console.log(isSpeaking ? "User is speaking" : "Silence detected")
})
```

### Consuming Captions

```typescript
const watch = new Watch.Broadcast({
    url: "https://relay.example.com",
    name: "broadcast-name",
    audio: { enabled: true }
})

// Captions are automatically consumed if available
watch.audio.captions.text.subscribe(text => {
    displaySubtitles(text)
})
```

## 3. Location Tracking & Peer Updates 📍

Spatial positioning system with peer-to-peer location updates for collaborative applications.

### Publishing Location

```typescript
const publish = new Publish.Broadcast({
    location: {
        enabled: true,
        current: { x: 0, y: 0, z: 0 },  // Initial position
        handle: "user123"  // Allow others to request position updates via this handle
    }
})

// Update position
publish.location.current.set({ x: 10, y: 20, z: 0 })

// Request another peer's location updates
const peer = publish.location.peer("other-user-handle")
peer.producer.subscribe(producer => {
    if (producer) {
        producer.update({ x: 5, y: 5, z: 0 })
    }
})
```

### Consuming Location Updates

```typescript
const watch = new Watch.Broadcast({ ... })

watch.location.position.subscribe(pos => {
    if (pos) {
        updateUserMarker(pos.x, pos.y, pos.z)
    }
})
```

## 4. Chat System 💬

Built-in chat messaging transmitted as MoQ tracks.

### Publishing Chat Messages

```typescript
const publish = new Publish.Broadcast({
    chat: { enabled: true }
})

// Send a message
publish.chat.message.set("Hello, world!")

// Messages are sent as new groups in the chat track
setTimeout(() => {
    publish.chat.message.set("Another message")
}, 1000)
```

### Consuming Chat Messages

```typescript
const watch = new Watch.Broadcast({ ... })

watch.chat.messages.subscribe(messages => {
    messages.forEach(msg => displayChatMessage(msg))
})
```

## 5. Preview System 👁️

Broadcast metadata and preview information.

### Publishing Preview Info

```typescript
const publish = new Publish.Broadcast({
    preview: {
        enabled: true,
        info: {
            title: "My Stream",
            description: "Live coding session",
            thumbnail: "data:image/png;base64,...",
            viewers: 42
        }
    }
})

// Update preview info dynamically
publish.preview.info.set({
    title: "Updated Title",
    viewers: 100
})
```

## 6. Web Components 🎮

Custom HTML elements for easy integration without JavaScript.

### Publishing Element

```html
<!-- Basic publisher with controls -->
<hang-publish 
    url="wss://relay.example.com"
    name="my-broadcast"
    device="camera"
    audio
    video
    controls>
    <video></video>
</hang-publish>

<!-- Publisher with transcription and captions -->
<hang-publish 
    url="wss://relay.example.com"
    name="my-broadcast"
    device="screen"
    audio
    video
    controls
    transcribe
    captions>
    <video></video>
</hang-publish>
```

### Watch Element

```html
<hang-watch 
    url="wss://relay.example.com"
    name="broadcast-to-watch"
    audio
    video>
    <canvas></canvas>
</hang-watch>
```

### Support Detection Element

```html
<!-- Shows browser compatibility information -->
<hang-support 
    mode="all"      <!-- "core" | "watch" | "publish" | "all" -->
    show="full"     <!-- "full" | "partial" | "none" -->
    details>        <!-- Show detailed codec information -->
</hang-support>
```

### Meeting Room Element

```html
<!-- Multi-party conference room -->
<hang-meet 
    url="wss://relay.example.com"
    name="room-name">
</hang-meet>
```

### JavaScript API for Web Components

```javascript
// Access the underlying objects
const publisher = document.querySelector('hang-publish')
publisher.broadcast.audio.captions.enabled.set(true)
publisher.broadcast.video.detection.enabled.set(true)

// Listen to events
publisher.broadcast.audio.captions.text.subscribe(text => {
    console.log("Caption:", text)
})
```

## 7. Advanced Media Capture 🎥

### Screen Sharing with Chrome-specific Features

```typescript
const publish = new Publish.Broadcast({
    device: "screen",  // "screen" | "camera" | undefined
    video: {
        enabled: true,
        constraints: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
        }
    },
    audio: {
        enabled: true,
        constraints: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        }
    }
})

// The library automatically handles:
// - Focus behavior (no focus change on capture)
// - Surface switching support
// - Current tab preference
// - Self browser surface exclusion
```

### Device Switching

```typescript
// Switch between camera and screen dynamically
publish.device.set("camera")
// ... later
publish.device.set("screen")
// ... or disable
publish.device.set(undefined)
```

## 8. Codec Capabilities Detection 🎨

Check what codecs the browser supports for encoding/decoding.

```typescript
import { isSupported } from "@kixelated/hang/support"

const capabilities = await isSupported()

console.log("Video capabilities:", capabilities.video)
// {
//   hardware: ["av1", "h264", "h265"],  // Hardware accelerated
//   software: ["vp8", "vp9"],           // Software only
//   unsupported: []                     // Not supported
// }

console.log("Audio capabilities:", capabilities.audio)
// {
//   hardware: ["opus"],
//   software: ["aac"],
//   unsupported: []
// }
```

## 9. Container Format System 📦

Custom container format for structured data like positions.

```typescript
import * as Container from "@kixelated/hang/container"

// Create a position producer
const track = new Moq.TrackProducer("position", 0)
const producer = new Container.PositionProducer(track)

// Send position updates
producer.update({ x: 1, y: 2, z: 3 })
producer.update({ x: 4, y: 5, z: 6 })

// Consumer side
const consumer = new Container.PositionConsumer(track)
consumer.position.subscribe(pos => {
    console.log(`Position: ${pos.x}, ${pos.y}, ${pos.z}`)
})
```

## 10. Room System 🏠

Multi-party conferencing with automatic broadcast discovery.

```typescript
import { Room } from "@kixelated/hang/meet"
import { Connection } from "@kixelated/hang"

const connection = new Connection({
    url: new URL("wss://relay.example.com")
})

const room = new Room(connection, {
    name: "conference-room"
})

// Monitor local broadcasts (your own)
room.locals.subscribe(localBroadcasts => {
    localBroadcasts.forEach(broadcast => {
        console.log("Local broadcast:", broadcast.name)
    })
})

// Monitor remote broadcasts (other participants)
room.remotes.subscribe(remoteBroadcasts => {
    remoteBroadcasts.forEach(broadcast => {
        console.log("Remote broadcast:", broadcast.name)
        // Create Watch instances for each remote broadcast
    })
})

// Add your own broadcast to the room
const myBroadcast = new Publish.Broadcast(connection, {
    name: `${room.name}/participant-${userId}`,
    audio: { enabled: true },
    video: { enabled: true }
})
```

## Complete Example: AI-Powered Live Stream

Here's how to combine multiple undocumented features:

```typescript
import { Publish, Watch } from "@kixelated/hang"
import { Connection } from "@kixelated/hang"

// Publisher with all features
const connection = new Connection({
    url: new URL("https://relay.cloudflare.mediaoverquic.com")
})

const publish = new Publish.Broadcast(connection, {
    enabled: true,
    name: "ai-powered-stream",
    device: "camera",
    
    audio: {
        enabled: true,
        captions: {
            enabled: true,
            ttl: 5000
        }
    },
    
    video: {
        enabled: true,
        detection: {
            enabled: true,
            interval: 500,
            threshold: 0.6
        }
    },
    
    location: {
        enabled: true,
        current: { x: 0, y: 0, z: 0 },
        handle: "streamer-1"
    },
    
    chat: {
        enabled: true
    },
    
    preview: {
        enabled: true,
        info: {
            title: "AI-Powered Stream",
            description: "Live object detection and transcription"
        }
    }
})

// Monitor AI features
publish.video.detection.objects.subscribe(objects => {
    const catCount = objects?.filter(o => o.label === "cat").length ?? 0
    if (catCount > 0) {
        publish.chat.message.set(`🐈 Detected ${catCount} cat(s)!`)
    }
})

publish.audio.captions.text.subscribe(text => {
    if (text?.toLowerCase().includes("hello")) {
        publish.chat.message.set("👋 Hello detected in speech!")
    }
})
```

## Notes and Limitations

1. **Model Downloads**: Object detection and transcription models are downloaded on first use (can be 10-50MB each)
2. **Browser Support**: These features require modern browsers with WebTransport support
3. **Performance**: AI features can be CPU/GPU intensive, especially on mobile devices
4. **Privacy**: All AI processing happens locally in the browser - no data is sent to external servers
5. **Experimental**: These APIs are undocumented because they're still experimental and may change

## Related Files

- Object Detection: `js/hang/src/publish/video/detection.ts`
- Captions: `js/hang/src/publish/audio/captions.ts`
- Location: `js/hang/src/publish/location.ts`
- Chat: `js/hang/src/publish/chat.ts`
- Web Components: `js/hang/src/*/element.ts`
- Room System: `js/hang/src/meet/room.ts`

## Future Features (Hints from the Code)

Based on the code structure, these features might be coming:
- Face detection and tracking
- Gesture recognition
- Background blur/replacement
- Audio effects and filters
- Multi-language transcription
- Real-time translation