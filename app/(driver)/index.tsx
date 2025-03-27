import React, { useState, useEffect, useRef } from "react";
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
import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://192.168.52.61:3000/driver";
const SERVER_URL = "http://192.168.52.61:3000";

const Driver = () => {
  const [location, setLocation]: any = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile]: any = useState(null);
  const [ambulanceDetails, setAmbulanceDetails]: any = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [rideStarted, setRideStarted] = useState(false);
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        transports: ["websocket"],
        forceNew: false,
        reconnectionAttempts: 10,
        timeout: 10000,
      });

      socketRef.current.on("connect", () => {
        console.log("Connected to socket:", socketRef.current?.id);
      });

      socketRef.current.on("disconnect", () => {
        console.log("Disconnected from socket");
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          router.replace("/(auth)");
          return;
        }

        const response = await axios.get(`http://192.168.52.61:3000/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const profile = response.data;
        console.log(profile)
        setUserProfile(profile);

        if (profile.user.userType !== "ambulance") {
          router.replace("/(home)");
          return;
        }
        console.log(profile.user)
        fetchAmbulanceDetails();

        const storedStatus = await AsyncStorage.getItem("driverStatus");
        if (storedStatus) {
          setIsOnline(storedStatus === "online");
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        router.replace("/(auth)");
      }
    };

    fetchUserProfile();

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

  const fetchAmbulanceDetails = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        router.replace("/(auth)");
        return;
      }

      const response = await axios.get("http://192.168.52.61:3000/getAmbulance", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAmbulanceDetails(response.data);
    } catch (error) {
      console.error("Error fetching ambulance details:", error);
    }
  };


  // Toggle online/offline status
  const toggleStatus = async () => {
    if (!ambulanceDetails?.vehicleId) {
      Alert.alert("Error", "Ambulance details are missing.");
      return;
    }

    const newStatus = !isOnline;
    setIsOnline(newStatus);
    await AsyncStorage.setItem("driverStatus", newStatus ? "online" : "offline");

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token is missing");
      const vehicleId = ambulanceDetails?.vehicleId
      console.log("Updated status:", {vehicleId,newStatus});
      socketRef.current?.emit("update-status", {
        vehicleId, // ✅ Send vehicleId instead of _id
        status: newStatus,
      });

    } catch (error: any) {
      console.error("Error updating driver status:", error.response?.data || error);
      Alert.alert("Error", "Failed to update status. Please try again.");
    }
  };

  const [locationSubscription, setLocationSubscription]:any = useState(null);

  // Effect to handle status updates & location tracking
  useEffect(() => {
      const startLocationUpdates = async () => {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
              console.log("⚠️ Location permission denied");
              return;
          }
          const vehicleId = ambulanceDetails?.vehicleId
          console.log("✅ Location tracking started");
          const subscription = await Location.watchPositionAsync(
              { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
              (location) => {
                  const { latitude, longitude } = location.coords;
                  socketRef.current?.emit("location-update", { vehicleId, latitude, longitude });
                  console.log(`📍 Sent location: ${latitude}, ${longitude}`);
              }
          );

          setLocationSubscription(subscription);
      };

      const stopLocationUpdates = () => {
          if (locationSubscription) {
              locationSubscription.remove();
              setLocationSubscription(null);
              console.log("❌ Stopped location updates");
          }
      };

      if (isOnline) {
        socketRef.current?.emit("update-status", { vehicleId:ambulanceDetails?.vehicleID, status: "online" });
          startLocationUpdates();
      } else {
          socketRef.current?.emit("update-status", { vehicleId:ambulanceDetails?.vehicleID, status: "offline" });
          stopLocationUpdates();
      }

      return () => stopLocationUpdates(); // Cleanup on unmount
  }, [isOnline]);

  return (
    <View className="bg-primary" style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Logout Button */}
        <TouchableOpacity onPress={() => AsyncStorage.removeItem("token").then(() => router.replace("/(auth)"))}>
          <Svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
          <Image source={userProfile?.user.profileImage ? { uri: userProfile?.user.profileImage } : require("@/assets/images/profile.png")} style={styles.profileImage} />
          <Text>{userProfile?.user.name}</Text>
        </View>
      </View>

      {/* Ambulance Details */}
      {ambulanceDetails && (
        <View style={styles.ambulanceInfo}>
          <Text style={styles.ambulanceText}>🚑 {userProfile?.user.name} ({ambulanceDetails.vehicleId})</Text>
        </View>
      )}

      {/* Map View */}
      <View style={styles.mapContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#ffffff" />
        ) : location ? (
          <MapView style={styles.map} customMapStyle={mapStyle} initialRegion={location} showsUserLocation={true}>
            <Marker coordinate={location} title="You are here" />
          </MapView>
        ) : (
          <Text style={styles.placeholderText}>Unable to load map.</Text>
        )}
      </View>
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
  ambulanceInfo: { padding: 10, backgroundColor: "#222", borderRadius: 10, margin: 10 },
  ambulanceText: { color: "white", fontSize: 16, fontWeight: "bold" },
});
