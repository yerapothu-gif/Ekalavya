import { Component } from 'react';

// Wraps embedded components owned by other in-progress branches (Tests,
// AI Summary). Those are still "Coming soon" stubs today; once merged, this
// boundary keeps a future incompatible export from crashing the whole
// dashboard instead of just that one panel.
export default class ExternalPanelBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div style={{ color: 'var(--text-muted)' }}>Coming soon</div>;
    }
    return this.props.children;
  }
}
