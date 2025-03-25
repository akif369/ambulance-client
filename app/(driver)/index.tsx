import React, { useState, useEffect } from "react";
import {
  View,
  Image,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import mapStyle from "@/assets/mapStyle.json";
import axios from "axios";
import { io } from "socket.io-client";



const SOCKET_URL = "http://192.168.215.61:3000";


const Driver = () => {
  const [location, setLocation]: any = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile]: any = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [rideStarted, setRideStarted] = useState(false);
  const router = useRouter();

  const socket = io(SOCKET_URL, {
    transports: ["websocket"], // Ensures real-time communication
    forceNew: true,
    reconnectionAttempts: 10,
    timeout: 10000,
  });

  useEffect(() => {
    const checkUserProfile = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          router.replace("/(auth)");
          return;
        }

        const response = await axios.get("http://192.168.215.61:3000/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const profile = response.data;
        setUserProfile(profile);

        if (profile.user.userType !== "ambulance") {
          router.replace("/(home)");
        }

        const storedStatus = await AsyncStorage.getItem("driverStatus");
        if (storedStatus) {
          setIsOnline(storedStatus === "online");
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        router.replace("/(auth)");
      }
    };

    checkUserProfile();

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Allow location access to use this feature.");
        setIsLoading(false);
        return;
      }
      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
      setIsLoading(false);
    })();
  }, []);

  // Toggle online/offline status
  const toggleStatus = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    await AsyncStorage.setItem("driverStatus", newStatus ? "online" : "offline");
  
    try {
      const token = await AsyncStorage.getItem("token");
      console.log("Token:", token); // Debugging token value
  
      if (!token) {
        throw new Error("Token is missing");
      }
  
      await axios.post(
        "http://192.168.215.61:3000/update-status",
        { status: newStatus ? "online" : "offline" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error("Error updating driver status:", error.response?.data || error);
      Alert.alert("Error", "Failed to update status. Please try again.");
    }
  };
  
  // Start/Stop ride function
  const toggleRide = () => {
    setRideStarted(!rideStarted);
    Alert.alert("Ride Status", rideStarted ? "Ride Ended" : "Ride Started");
  };

  // Logout function
  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("token");
              router.replace("/(auth)");
            } catch (error) {
              console.error("Error removing token:", error);
              Alert.alert("Error", "Failed to logout. Please try again.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View className="bg-primary" style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Hamburger Menu */}
        <TouchableOpacity onPress={handleLogout}>
          <Svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="M3 12h18M3 6h18M3 18h18" />
          </Svg>
        </TouchableOpacity>

        {/* Toggle Online/Offline */}
        <View style={styles.toggleContainer}>
          <Text style={styles.statusText}>{isOnline ? "Online" : "Offline"}</Text>
          <Switch value={isOnline} onValueChange={toggleStatus} thumbColor="#fff" trackColor={{ false: "#767577", true: "#007AFF" }} />
        </View>

        {/* Profile Image */}
        <View style={styles.profileSection}>
          <Image
            source={userProfile?.profileImage ? { uri: userProfile.profileImage } : require("@/assets/images/profile.png")}
            style={styles.profileImage}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Map View */}
      <View style={styles.mapContainer}>
        {isLoading ? (
          <View style={styles.placeholder}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.placeholderText}>Loading map...</Text>
          </View>
        ) : location ? (
          <MapView
            style={styles.map}
            customMapStyle={mapStyle}
            initialRegion={location}
            showsUserLocation={true}
          >
            <Marker coordinate={location} title="You are here" />
          </MapView>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Unable to load map.</Text>
          </View>
        )}
      </View>

      {/* Start Ride Button */}
      <TouchableOpacity className="bottom-5 absolute left-10 right-10 " style={styles.startRideButton} onPress={toggleRide}>
        <Text style={styles.startRideText}>{rideStarted ? "End Ride" : "Start Ride"}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Driver;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 20,
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusText: {
    color: "white",
    fontSize: 14,
    marginRight: 5,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  mapContainer: {
    flex: 1,
    marginTop: 10,
  },
  map: {
    flex: 1,
  },
  startRideButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  startRideText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "white",
    fontSize: 18,
  },
});
