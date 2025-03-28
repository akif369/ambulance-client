import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";

interface EmergencyModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    emergencyDetails: string;
    patientCount: number;
    criticalLevel: string;
  }) => void;
  isSubmitting: boolean;
}

const EmergencyModal: React.FC<EmergencyModalProps> = ({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [emergencyDetails, setEmergencyDetails] = useState("");
  const [patientCount, setPatientCount] = useState("1");
  const [criticalLevel, setCriticalLevel] = useState("medium");

  const handleSubmit = () => {
    if (!emergencyDetails.trim()) {
      Alert.alert("Error", "Please provide emergency details");
      return;
    }
    
    onSubmit({
      emergencyDetails,
      patientCount: parseInt(patientCount) || 1,
      criticalLevel,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Emergency Details</Text>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.label}>Emergency Details*</Text>
            <TextInput
              style={styles.input}
              multiline
              numberOfLines={4}
              placeholder="Describe the emergency situation..."
              value={emergencyDetails}
              onChangeText={setEmergencyDetails}
            />

            <Text style={styles.label}>Number of Patients*</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={patientCount}
              onChangeText={(text) => setPatientCount(text.replace(/[^0-9]/g, ""))}
            />

            <Text style={styles.label}>Critical Level*</Text>
            <View style={styles.buttonGroup}>
              {["low", "medium", "high", "critical"].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.levelButton,
                    criticalLevel === level && styles.selectedLevel,
                  ]}
                  onPress={() => setCriticalLevel(level)}
                >
                  <Text
                    style={[
                      styles.levelButtonText,
                      criticalLevel === level && styles.selectedLevelText,
                    ]}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Submit Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#1e1e1e",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    color: "white",
    fontSize: 16,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#333",
    color: "white",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  buttonGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  levelButton: {
    backgroundColor: "#333",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  selectedLevel: {
    backgroundColor: "#ff3b30",
  },
  levelButtonText: {
    color: "white",
    fontSize: 14,
  },
  selectedLevelText: {
    fontWeight: "bold",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#333",
  },
  submitButton: {
    backgroundColor: "#ff3b30",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});

export default EmergencyModal;