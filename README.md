# Chica - Text to Speech Converter

Chica is a modern web application that converts text and documents into downloadable MP3 audio files. Perfect for students who want to listen to their study notes while preparing for exams.

## Features

- 🎤 **Text Input**: Type or paste text directly into the interface
- 📄 **File Upload**: Support for PDF, Word (.doc, .docx), and plain text files
- 🎛️ **Voice Customization**: Choose different voices, adjust speed and pitch
- ▶️ **Audio Playback**: Play, pause, and stop audio controls
- 💾 **MP3 Download**: Save audio as MP3 files for offline listening
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 🎨 **Modern UI**: Clean, intuitive interface with smooth animations

## How to Use

1. **Add Text**:
   - Click the "Text Input" tab and type/paste your text
   - OR click the "Upload File" tab and upload a PDF, Word, or text file

2. **Customize Voice**:
   - Select your preferred voice from the dropdown
   - Adjust the speed (0.5x - 2.0x)
   - Modify the pitch (0.5 - 2.0)

3. **Generate Audio**:
   - Click "Play Audio" to listen to the text
   - Use Pause/Stop controls as needed

4. **Download MP3**:
   - Click "Download MP3" to save the audio file

## Technology Stack

- **HTML5**: Semantic markup and structure
- **CSS3**: Modern styling with Tailwind CSS
- **JavaScript**: Core functionality and interactions
- **Web Speech API**: Text-to-speech synthesis
- **PDF.js**: PDF document parsing
- **Mammoth.js**: Word document processing

## Browser Support

Chica works best with modern browsers that support the Web Speech API:
- Chrome 33+
- Firefox 49+
- Safari 14.1+
- Edge 79+

## Installation

1. Clone or download the project files
2. Open `index.html` in a modern web browser
3. No additional installation required!

## File Structure

```
chica/
├── index.html          # Main HTML file
├── styles.css          # Custom CSS styles
├── script.js           # JavaScript functionality
└── README.md           # Project documentation
```

## Limitations

- MP3 conversion uses browser-based audio generation (simplified implementation)
- For production use, consider integrating with a cloud TTS service for higher quality audio
- File size limitations may apply for very large documents

## Future Enhancements

- [ ] Integration with cloud TTS services (Google TTS, Amazon Polly)
- [ ] Support for more file formats (EPUB, HTML)
- [ ] Audio editing capabilities
- [ ] Batch processing of multiple files
- [ ] Cloud storage integration
- [ ] Mobile app version

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is open source and available under the MIT License.

---

Made with ❤️ for students preparing for exams
