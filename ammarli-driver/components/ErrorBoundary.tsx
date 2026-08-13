import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Line } from 'react-native-svg';

const THEME_NAVY = '#012047';
const THEME_YELLOW = '#FFCC00';

// ─── Error SVG Icon ────────────────────────────────────────────────────────
const ErrorIcon = () => (
  <Svg width={90} height={90} viewBox="0 0 90 90" fill="none">
    <Circle cx="45" cy="45" r="42" stroke={THEME_NAVY} strokeWidth="3" opacity="0.1" />
    <Circle cx="45" cy="45" r="34" fill="#FFF3CD" />
    {/* Warning triangle */}
    <Path
      d="M45 22 L67 62 H23 Z"
      fill={THEME_YELLOW}
      stroke={THEME_NAVY}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* Exclamation mark */}
    <Line x1="45" y1="38" x2="45" y2="52" stroke={THEME_NAVY} strokeWidth="3" strokeLinecap="round" />
    <Circle cx="45" cy="57" r="2" fill={THEME_NAVY} />
  </Svg>
);

// ─── Props & State ─────────────────────────────────────────────────────────
interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

// ─── ErrorBoundary Class ───────────────────────────────────────────────────
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production: send to crash analytics (e.g., Sentry)
    console.warn('[ErrorBoundary]', error.message, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ErrorIcon />

          <Text style={styles.title}>
            {this.props.fallbackTitle || 'حدث خطأ غير متوقع'}
          </Text>

          <Text style={styles.message}>
            {this.props.fallbackMessage ||
              'نعتذر عن هذا الإزعاج. يرجى المحاولة مجدداً، أو التواصل مع الدعم الفني إن استمرت المشكلة.'}
          </Text>

          <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry} activeOpacity={0.8}>
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 35,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Cairo-Bold',
    color: THEME_NAVY,
    textAlign: 'center',
    marginTop: 28,
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    fontFamily: 'Cairo-Regular',
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  retryButton: {
    backgroundColor: THEME_YELLOW,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 32,
    elevation: 5,
    shadowColor: THEME_YELLOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  retryText: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: THEME_NAVY,
  },
});

export default ErrorBoundary;
