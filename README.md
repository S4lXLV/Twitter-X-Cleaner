# Twitter/X Cleaner

A Chrome extension that helps you declutter your Twitter/X interface by removing unnecessary items from the left sidebar, providing a cleaner and more focused social media experience.

## Features

- Customizable sidebar cleaning
- Real-time updates without page refresh
- Easy-to-use popup interface
- Persistent settings across sessions
- Automatic cleaning when navigating Twitter/X

## Installation

1. Clone this repository or download the ZIP file
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Usage

1. Click the extension icon in your Chrome toolbar
2. Toggle which sidebar items you want to hide/show
3. Changes are applied immediately to your Twitter/X interface
4. Settings are automatically saved and persist between browser sessions

## How It Works

The extension uses a content script to monitor and modify the Twitter/X interface. It:
- Automatically detects sidebar elements
- Applies user-defined filters
- Uses a MutationObserver to handle dynamic content
- Maintains state across page navigation

## Development

The extension consists of several key files:
- `popup.html/js`: User interface for controlling settings
- `content.js`: Handles the actual Twitter/X page modifications
- `background.js`: Manages extension state and communication

## Contributing

Feel free to contribute to this project by:
1. Forking the repository
2. Creating a feature branch
3. Submitting a pull request

## License

This project is open source and available under the MIT License.

## Author

Created by [S4lXLV](https://github.com/S4lXLV)
