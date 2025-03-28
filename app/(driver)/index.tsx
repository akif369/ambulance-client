import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Image,
  StyleSheet,
  Alert,
  Text,Modal,
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


const SERVER_API =  process.env.EXPO_PUBLIC_API_URL
const SOCKET_API_URL =  process.env.EXPO_PUBLIC_SOCKET_URL

const calculateDistance = (loc1:any, loc2:any) => {
  const R = 6371; // Earth radius in km
  const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
  const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(loc1.latitude * Math.PI / 180) * 
    Math.cos(loc2.latitude * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return (R * c).toFixed(2);
};


const Driver = () => {
  const [location, setLocation]: any = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile]: any = useState(null);
  const [ambulanceDetails, setAmbulanceDetails]: any = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [rideStarted, setRideStarted] = useState(false);
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [disableModal,setDisableModal] = useState(false);

  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedRequest, setSelectedRequest]:any = useState(null);



  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_API_URL + "/driver", {
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

        const response = await axios.get(`${SERVER_API}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const profile = response.data;
        console.log(profile);
        setUserProfile(profile);

        if (profile.user.userType !== "ambulance") {
          router.replace("/(home)");
          return;
        }
        console.log(profile.user);
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

  const fetchAmbulanceDetails = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        router.replace("/(auth)");
        return;
      }

      const response = await axios.get(SERVER_API + "/getAmbulance", {
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
    await AsyncStorage.setItem(
      "driverStatus",
      newStatus ? "online" : "offline"
    );

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Token is missing");
      const vehicleId = ambulanceDetails?.vehicleId;
      console.log("Updated status:", { vehicleId, newStatus });
      socketRef.current?.emit("update-status", {
        vehicleId, // ✅ Send vehicleId instead of _id
        status: newStatus,
      });
    } catch (error: any) {
      console.error(
        "Error updating driver status:",
        error.response?.data || error
      );
      Alert.alert("Error", "Failed to update status. Please try again.");
    }
  };

  useEffect(()=>{
    socketRef.current?.on("accepted-progress",()=>{
      setDisableModal(true)
    })
  },[])

  useEffect(()=>{
    socketRef.current?.on("accepted-progress-disable",()=>{
      console.log("Drop off Successfull")
      setDisableModal(false)
      toggleStatus();
    })
  },[])


  useEffect(() => {
    if (isOnline) {
      const handlePendingRequests = (requests:any) => {
        console.log("Received pending requests:", requests);
        setPendingRequests(requests);
      };
  
      const handleNewRequest = (newRequest:any) => {
        console.log("New emergency request received:", newRequest);
        setPendingRequests(prev => [...prev, newRequest]);
      };
  
      // Setup socket listeners
      socketRef.current?.on('pending-requests', handlePendingRequests);
      socketRef.current?.on('new-emergency-request', handleNewRequest);
  
      // Fetch initial requests
      socketRef.current?.emit('get-pending-requests');
  
      // Cleanup function
      return () => {
        socketRef.current?.off('pending-requests', handlePendingRequests);
        socketRef.current?.off('new-emergency-request', handleNewRequest);
      };
    } else {
      // Clear pending requests when going offline
      setPendingRequests([]);
    }
  }, [isOnline]);

  const handleRequestAction = async (action) => {
    try {
      if (!selectedRequest) return;
  
      // Update request status via socket
      socketRef.current?.emit('update-request-status', {
        requestId: selectedRequest._id,
        status: action
      });
  
      // Close modal if action is completed/cancelled
      if (['completed', 'cancelled'].includes(action)) {
        setSelectedRequest(null);
      }

  
    } catch (error:any) {
      Alert.alert('Error', `Failed to ${action} request: ${error.message}`);
    }
  };

const handleAcceptRequest = (requestId:string) => {
  
  socketRef.current?.emit('accept-request', {
    requestId,
    vehicleId:ambulanceDetails?.vehicleId 
  });
  setSelectedRequest(null);
};

  const [locationSubscription, setLocationSubscription]: any = useState(null);

  // Effect to handle status updates & location tracking
  useEffect(() => {
    const startLocationUpdates = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("⚠️ Location permission denied");
        return;
      }
      const vehicleId = ambulanceDetails?.vehicleId;
      console.log("✅ Location tracking started");
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          socketRef.current?.emit("location-update", {
            vehicleId,
            latitude,
            longitude,
          });
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
      socketRef.current?.emit("update-status", {
        vehicleId: ambulanceDetails?.vehicleID,
        status: "online",
      });
      startLocationUpdates();
    } else {
      socketRef.current?.emit("update-status", {
        vehicleId: ambulanceDetails?.vehicleID,
        status: "offline",
      });
      stopLocationUpdates();
    }

    return () => stopLocationUpdates(); // Cleanup on unmount
  }, [isOnline]);

  return (
    <View className="bg-primary" style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Logout Button */}
        <TouchableOpacity
          onPress={() =>
            AsyncStorage.removeItem("token").then(() =>
              router.replace("/(auth)")
            )
          }
        >
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
          <Text style={styles.statusText}>
            {isOnline ? "Online" : "Offline"}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={toggleStatus}
            thumbColor="#fff"
            trackColor={{ false: "#767577", true: "#007AFF" }}
          />
        </View>

        {/* Profile Image */}
        <View style={styles.profileSection}>
          <Image
            source={
              userProfile?.user.profileImage
                ? { uri: userProfile?.user.profileImage }
                : require("@/assets/images/profile.png")
            }
            style={styles.profileImage}
          />
          <Text style={styles.profileName}>{userProfile?.user.name}</Text>
        </View>
      </View>

      {/* Ambulance Details */}
      {ambulanceDetails && (
        <View style={styles.ambulanceInfo}>
          <Text style={styles.ambulanceText}>
            🚑 {userProfile?.user.name} ({ambulanceDetails.vehicleId})
          </Text>
        </View>
      )}

      {/* Map View */}
      <View style={styles.mapContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#ffffff" />
        ) : location ? (
          <MapView
            style={styles.map}
            customMapStyle={mapStyle}
            initialRegion={location}
            showsUserLocation={true}
          >
            {pendingRequests.map((request:any) => (
              <Marker
                key={request._id}
                coordinate={{
                  latitude: request.location.latitude,
                  longitude: request.location.longitude,
                }}
                onPress={() => setSelectedRequest(request)}
              >
                <Image
                  source={require("@/assets/images/emergency-marker.png")}
                  style={[
                   
                    {
                      transform: [
                        {
                          scale:
                            1 +
                            (request.criticalLevel === "critical" ? 0.3 : 0),
                        },
                      ],
                    },
                  ]}
                />
              </Marker>
            ))}
          </MapView>
        ) : (
          <Text style={styles.placeholderText}>Unable to load map.</Text>
        )}
      </View>

     {disableModal || <Modal
        visible={!!selectedRequest}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedRequest(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedRequest && (
              <>
                <Text style={styles.modalTitle}>Emergency Details</Text>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRequest.emergencyDetails}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Patients:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRequest.patientCount}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Critical Level:</Text>
                  <Text
                    style={[
                      styles.detailValue,
                      styles[selectedRequest.criticalLevel],
                    ]}
                  >
                    {selectedRequest.criticalLevel.toUpperCase()}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Distance:</Text>
                  <Text style={styles.detailValue}>
                    {calculateDistance(
                      location,
                      selectedRequest.location
                    )}{" "}
                    km
                  </Text>
                </View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setSelectedRequest(null)}
                  >
                    <Text style={styles.buttonText}>Close</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptRequest(selectedRequest._id)}
                  >
                    <Text style={styles.buttonText}>Accept Request</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>}


      {disableModal && (
  <Modal
    visible={!!selectedRequest}
    transparent
    animationType="slide"
    onRequestClose={() => setSelectedRequest(null)}
  >
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        {selectedRequest && (
          <>
            <Text style={styles.modalTitle}>Emergency Details</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type:</Text>
              <Text style={styles.detailValue}>
                {selectedRequest.emergencyDetails}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Patients:</Text>
              <Text style={styles.detailValue}>
                {selectedRequest.patientCount}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <Text
                style={[
                  styles.detailValue,
                  styles[selectedRequest.status] // Add status-based styling
                ]}
              >
                {selectedRequest.status?.replace('_', ' ').toUpperCase()}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Distance:</Text>
              <Text style={styles.detailValue}>
                {calculateDistance(location, selectedRequest.location)} km
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              {selectedRequest.status === 'pending' ? (
                <>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setSelectedRequest(null)}
                  >
                    <Text style={styles.buttonText}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() =>handleAcceptRequest(selectedRequest._id)}
                  >
                    <Text style={styles.buttonText}>Accept Request</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleRequestAction('cancelled')}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={() => handleRequestAction('completed')}
                  >
                    <Text style={styles.buttonText}>Complete</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}
      </View>
    </View>
  </Modal>
)}

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
  },profileName: {
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
  ambulanceInfo: {
    padding: 10,
    backgroundColor: "#222",
    borderRadius: 10,
    margin: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    fontWeight: '600',
    color: '#666',
  },
  detailValue: {
    fontWeight: '500',
  },
  critical: {
    color: '#ff3b30',
    fontWeight: 'bold',
  },
  high: {
    color: '#ff9500',
  },
  medium: {
    color: '#ffcc00',
  },
  low: {
    color: '#34c759',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  acceptButton: {
    backgroundColor: '#34c759',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginLeft: 10,
  },
  closeButton: {
    backgroundColor: '#ff3b30',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#ff3b30',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 5,
  },
  completeButton: {
    backgroundColor: '#34c759',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginLeft: 5,
  },
  statusIndicator: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  pending: {
    color: '#ff9500',
  },
  accepted: {
    color: '#007AFF',
  },
  in_progress: {
    color: '#5856d6',
  },
  completed: {
    color: '#34c759',
  },
  cancelled: {
    color: '#ff3b30',
  },
  ambulanceText: { color: "white", fontSize: 16, fontWeight: "bold" },
});
