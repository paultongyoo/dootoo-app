import { Stack, Link, router } from "expo-router";
import { useRef } from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';


const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#FAF3E0',
    height: 75
  },
  headerLeftContainer: {
    position: 'absolute',
    left: 10,
    bottom: 5
  },
  headerRightContainer: {
    position: 'absolute',
    right: 10,
    bottom: 5
  },
  mainLogoContainer: {
    flexDirection: 'row',
    position: 'relative',
    bottom: -4
  },
  mainLogoPart: {
    fontSize: 28
  },
  secondLogoPart: {
    color: "#A23E48"
  },
  mainProfileIconContainer: {
    position: 'relative',
    bottom: -4
  },
  profileIcon: {
    height: 40,
    width: 40
  }
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer 
        screenOptions={
        {
          drawerPosition: 'right',
          header: ({ navigation, route, options }) => { 
            return (
              <View style={styles.headerContainer}>
                <View style={styles.headerLeftContainer}>
                    <View style={styles.mainLogoContainer}>
                    <Text style={styles.mainLogoPart}>doo</Text>
                    <Text style={[styles.mainLogoPart, styles.secondLogoPart]}>too</Text>
                  </View>
                </View>
                <View style={styles.headerRightContainer}>
                  <Pressable style={styles.mainProfileIconContainer}
                             onPress={() => navigation.openDrawer()}>
                    <Image style={styles.profileIcon} source={require('../assets/images/profile_icon_green.png')} />
                  </Pressable>
                </View>
            </View>
            );
          }
        }
      }/>
    </GestureHandlerRootView>
  );
}