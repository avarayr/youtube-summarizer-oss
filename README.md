# YouTube Summary Extension



https://github.com/user-attachments/assets/670678a7-4ce2-4f6d-9f25-a4421309071e




A Chrome extension that generates concise summaries of YouTube videos using AI. Supports multiple AI providers including OpenAI, Google AI, and OpenRouter.

## Features

- Generate summaries of YouTube videos
- Chat with AI about the video content
- Support for multiple AI providers
- Real-time streaming responses
- Dark mode interface

## Quick Installation

1. Go to the [Releases](../../releases) page
2. Download `extension-unpacked.zip`
3. Open Chrome and go to `chrome://extensions`
4. Enable "Developer mode" in the top right
5. Drag and drop `extension-unpacked.zip` directly onto the extensions page

That's it! No need to extract the ZIP or click any buttons.

## Configuration

1. Click the extension icon in Chrome
2. Select your preferred AI provider
3. Enter your API key
4. Optional: Select a specific model from the available options

## Usage

1. Navigate to any YouTube video
2. Click the "Summarize" button below the video
3. Wait for the AI to generate a summary
4. Use the chat feature to ask questions about the video

## Development

```bash
# Install dependencies
bun install

# Watch for changes during development
bun run dev

# Build for production
bun run build
```

Then, click "Load unpacked" in chrome://extensions and select the `public` folder

When rebuilding, you can click on the "Refresh" icon to see changes propagate to the extension.

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](LICENSE)
