import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Image,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import mapStyle from "@/assets/mapStyle.json"; // Dark mode map style
import axios from "axios"; // Import Axios for API calls
import { io, Socket } from "socket.io-client";
import Modal from "@/components/EmergencyModal";

const SERVER_API =  process.env.EXPO_PUBLIC_API_URL
const SOCKET_API_URL =  process.env.EXPO_PUBLIC_SOCKET_URL

const Home = () => {
  const [location, setLocation]: any = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile]: any = useState(null);
  const router = useRouter();
  const [ambulanceLocations, setAmbulanceLocations] = useState<
    { vehicleId: string; latitude: number; longitude: number }[]
  >([]);

  const socketRef = useRef<Socket | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmergencyPress = () => {
    if (!location) {
      Alert.alert("Error", "Location not available. Please wait...");
      return;
    }
    setModalVisible(true);
  };

  
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_API_URL + "/client", {
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

      socketRef.current?.emit("setAmbulance");
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const handleSubmitEmergency = async (formData:any) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
  
      // Get user ID from profile
      if (!userProfile?.user?.id) throw new Error("User not found");
      
      // Emit emergency request via socket
      socketRef.current?.emit("emergency-request", {
        userId: userProfile.user.id,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: "Current Location" // Add geocoding if available
        },
        emergencyDetails: formData.emergencyDetails,
        patientCount: formData.patientCount,
        criticalLevel: formData.criticalLevel
      });
 
      setModalVisible(false);
      // Listen for acceptance
      socketRef.current?.on("request-accepted", (data) => {
        Alert.alert("Ambulance Arriving!", `Ambulance ID: ${data.ambulanceId}\nETA: ${data.estimatedTime}`);
      });
  
      socketRef.current?.on("request-error", (error) => {
        Alert.alert("Error", error);
      });
  
    } catch (error:any) {
      Alert.alert("Error", error.message);
    }
  };

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.emit("setAmbulance");

      socketRef.current.on("active-ambulances", (ambulances) => {
        console.log("🚑 Received active ambulances:", ambulances);

        // Transform data before updating state
        const transformedAmbulances = ambulances.map((ambulance: any) => ({
          vehicleId: ambulance.vehicleId,
          latitude: ambulance.currentLocation.latitude,
          longitude: ambulance.currentLocation.longitude,
        }));

        setAmbulanceLocations(transformedAmbulances); // Update state
      });

      return () => {
        socketRef.current?.off("active-ambulances");
      };
    }
  }, []);

  useEffect(() => {
    if (!socketRef.current) return;
    const handleAmbulanceLocation = (data: {
      vehicleId: string;
      latitude: number;
      longitude: number;
    }) => {
      console.log("🚑 Ambulance location updated:", data);

      setAmbulanceLocations((prevLocations) => {
        const existingIndex = prevLocations.findIndex(
          (item) => item.vehicleId === data.vehicleId
        );
        if (existingIndex !== -1) {
          // Update existing ambulance location
          const updatedLocations = [...prevLocations];
          updatedLocations[existingIndex] = data;
          return updatedLocations;
        } else {
          // Add new ambulance marker
          return [...prevLocations, data];
        }
      });
    };

    socketRef.current.on("ambulance-location", handleAmbulanceLocation);

    return () => {
      socketRef.current?.off("ambulance-location", handleAmbulanceLocation);
    };
  }, []);

  useEffect(() => {
    if (!socketRef.current) return;
    const handleRemoveAmbulance = ({ vehicleId }: any) => {
      console.log(`🛑 Removing ambulance ${vehicleId} from map`);
      setAmbulanceLocations((prevLocations) =>
        prevLocations.filter((ambulance) => ambulance.vehicleId !== vehicleId)
      );
    };

    socketRef.current.on("remove-ambulance", handleRemoveAmbulance);

    return () => {
      socketRef.current?.off("remove-ambulance", handleRemoveAmbulance);
    };
  }, []);

  useEffect(() => {
    const checkUserProfile = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          router.replace("/(auth)"); // Redirect to auth if not authenticated
          return;
        }

        // Fetch user profile
        const response = await axios.get(SERVER_API + "/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const profile = response.data;
        setUserProfile(profile);

        if (profile.user.userType === "ambulance") {
          router.replace("/(driver)");
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        router.replace("/(auth)"); // Fallback to auth page if request fails
      }
    };

    checkUserProfile();

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Allow location access to use this feature."
        );
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

  // Function to handle logout
  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Hamburger Icon */}
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

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Image
            source={
              userProfile?.user.profileImage
                ? { uri: userProfile.user.profileImage }
                : require("@/assets/images/profile.png")
            }
            style={styles.profileImage}
            resizeMode="cover"
          />
          <Text style={styles.profileName}>
            {userProfile?.user.name || "User"}
          </Text>
        </View>
      </View>

      {/* Google Map View */}
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
            {ambulanceLocations.map((ambulance) => (
              <Marker
                key={ambulance.vehicleId}
                coordinate={{
                  latitude: ambulance.latitude,
                  longitude: ambulance.longitude,
                }}
                anchor={{ x: 0.5, y: 0.5 }} // Center the marker on coordinates
                title={`Ambulance ${ambulance.vehicleId}`}
              >
                <Image
                  source={require("@/assets/images/ambulance-marker.png")}
                  style={[
                    { transform: [{ scale: 1 }] }, // Add scale animation here if needed
                  ]}
                  resizeMode="contain"
                />
              </Marker>
            ))}
          </MapView>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Unable to load map.</Text>
          </View>
        )}
      </View>

      {/* Emergency Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.emergencyButton}
          onPress={handleEmergencyPress}
        >
          <Text style={styles.buttonText}>EMERGENCY</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSubmitEmergency}
        isSubmitting={isSubmitting}
      />
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212", // Dark background
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 20,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  profileName: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  mapContainer: {
    flex: 1,
    marginTop: 10,
  },
  map: {
    flex: 1,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  emergencyButton: {
    backgroundColor: "#ff3b30",
    paddingVertical: 15,
    width: "100%",
    borderRadius: 10,
    alignItems: "center",
    elevation: 5,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
  },
  placeholderText: {
    color: "white",
    fontSize: 18,
    marginTop: 10,
  },
});
