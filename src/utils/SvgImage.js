import React from 'react';
import { SvgXml } from 'react-native-svg';
import { Image, StyleSheet } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

/**
 * A component that renders SVG content from files that have PNG extensions
 * This is a workaround for the issue where PNG files actually contain SVG markup
 */
class SvgImage extends React.Component {
  state = {
    svgContent: null,
    isLoading: true,
    fallbackToImage: false
  };

  async componentDidMount() {
    await this.loadSvgContent();
  }

  async componentDidUpdate(prevProps) {
    if (prevProps.source !== this.props.source) {
      await this.loadSvgContent();
    }
  }

  loadSvgContent = async () => {
    try {
      const { source } = this.props;
      
      // Handle require('./path/to/file.png') format
      if (typeof source !== 'number' && source.uri) {
        // Handle remote URLs or local file URIs
        this.setState({ fallbackToImage: true });
        return;
      }

      // For local assets loaded with require()
      const asset = Asset.fromModule(source);
      await asset.downloadAsync();
      
      if (!asset.localUri) {
        this.setState({ fallbackToImage: true });
        return;
      }

      // Check if the file is a JPG by examining the localUri
      if (asset.localUri.toLowerCase().endsWith('.jpg') || 
          asset.localUri.toLowerCase().endsWith('.jpeg')) {
        // Don't try to read JPG files as SVG
        this.setState({ fallbackToImage: true, isLoading: false });
        return;
      }

      try {
        const fileContent = await FileSystem.readAsStringAsync(asset.localUri);
        
        // Check if the content is SVG (starts with '<svg' or has svg namespace)
        if (fileContent.includes('<svg') || fileContent.includes('xmlns="http://www.w3.org/2000/svg"')) {
          this.setState({ svgContent: fileContent, isLoading: false });
        } else {
          // If not SVG, fallback to regular Image
          this.setState({ fallbackToImage: true, isLoading: false });
        }
      } catch (fileReadError) {
        console.error('Error reading file content:', fileReadError);
        this.setState({ fallbackToImage: true, isLoading: false });
      }
    } catch (error) {
      console.error('Error loading image:', error);
      this.setState({ fallbackToImage: true, isLoading: false });
    }
  };

  render() {
    const { style, ...otherProps } = this.props;
    const { svgContent, isLoading, fallbackToImage } = this.state;

    if (isLoading) {
      return null; // Or a loading indicator
    }

    if (fallbackToImage || !svgContent) {
      return <Image source={this.props.source} style={style} {...otherProps} />;
    }

    // Get dimensions from style
    const flattenedStyle = StyleSheet.flatten(style) || {};
    const { width = 100, height = 100 } = flattenedStyle;

    return (
      <SvgXml xml={svgContent} width={width} height={height} style={style} {...otherProps} />
    );
  }
}

export default SvgImage;