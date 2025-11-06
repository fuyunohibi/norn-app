import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  // The routing logic is handled in _layout.tsx
  // This component just shows a loading state while navigation resolves
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
