import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import { initalizeUser, getUsername } from '../components/LocalStorage.js';



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
  },
  profileDrawerContainer: {
    backgroundColor: '#FAF3E0',
    flex: 1,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#3E2723',
    alignItems: 'center'
  },
  profileDrawerCloseContainer: {
    position: 'absolute',
    right: 20,
    top: 40
  },
  profileDrawerCloseIcon: {
    opacity: 0.4,
    height: 32,
    width: 30
  },
  profileDrawerProfileIconContainer: {
    position: 'relative',
    top: 100,
    //backgroundColor: 'red',
    alignItems: 'center'
  },
  profileDrawerProfileIcon: {
    height: 150,
    width: 150,
    //backgroundColor: 'yellow'
  },
  profileDrawerProfileNameContainer: {
    
  },
  profileDrawerProfileNameText: {
    fontSize: 20
  }
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer 
        drawerContent={(props) => <ProfileDrawer {...props} />}
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

function ProfileDrawer({ navigation }) {
  const [username, setUsername] = useState('');
  const loadUsername = async() => {
    const loadedUsername = await getUsername();
    setUsername(loadedUsername);
  }

  useEffect(() => {
    initalizeUser();
    loadUsername();
  }, []);

  return (
    <View style={styles.profileDrawerContainer}>
      <Pressable style={styles.profileDrawerCloseContainer}
                 onPress={() => navigation.closeDrawer()}>
        <Image style={styles.profileDrawerCloseIcon} source={require('../assets/images/cancel_icon_black.png')} />
      </Pressable>
      <View style={styles.profileDrawerProfileIconContainer}>
        <Image style={styles.profileDrawerProfileIcon} source={require('../assets/images/profile_icon_green.png')} />
        <View style={styles.profileDrawerProfileNameContainer}>
          <Text style={styles.profileDrawerProfileNameText}>{username}</Text>
        </View>
      </View>
    </View>
  );
}