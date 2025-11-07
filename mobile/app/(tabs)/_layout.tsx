import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <NativeTabs
      tintColor="#FF7300"
      labelStyle={{
        fontSize: 10,
        fontWeight: '600',
      }}
    >
      <NativeTabs.Trigger name="index">
        <Label>Home</Label>
        {Platform.select({
          // Use outline for inactive, filled for active
          ios: <Icon sf={{ default: 'house', selected: 'house.fill' }} />,
          android: (
            <Icon
              src={
                <VectorIcon 
                  family={MaterialIcons} 
                  name="home"
                />
              }
            />
          ),
        })}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="health">
        <Label>Health</Label>
        {Platform.select({
          // Use outline for inactive, filled for active
          ios: <Icon sf={{ default: 'heart', selected: 'heart.fill' }} />,
          android: (
            <Icon
              src={
                <VectorIcon 
                  family={MaterialIcons} 
                  name="favorite-border"
                />
              }
            />
          ),
        })}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Label>Profile</Label>
        {Platform.select({
          // Use outline for inactive, filled for active
          ios: <Icon sf={{ default: 'person', selected: 'person.fill' }} />,
          android: (
            <Icon
              src={
                <VectorIcon 
                  family={MaterialIcons} 
                  name="person-outline"
                />
              }
            />
          ),
        })}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
