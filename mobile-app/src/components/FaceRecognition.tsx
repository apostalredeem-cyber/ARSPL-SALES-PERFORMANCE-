import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { Feather } from '@expo/vector-icons';

interface FaceRecognitionProps {
    visible: boolean;
    onClose: () => void;
    onCapture: (uri: string) => void;
}


export default function FaceRecognition({ visible, onClose, onCapture }: FaceRecognitionProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [isReady, setIsReady] = useState(false);
    const cameraRef = useRef<any>(null);

    useEffect(() => {
        if (visible && !permission?.granted) {
            requestPermission();
        }
    }, [visible]);

    if (!permission) {
        return null;
    }

    if (!permission.granted) {
        return (
            <Modal visible={visible} animationType="slide">
                <View style={styles.permissionContainer}>
                    <Text style={styles.permissionText}>We need your permission to show the camera for face verification.</Text>
                    <TouchableOpacity style={styles.button} onPress={requestPermission}>
                        <Text style={styles.buttonText}>Grant Permission</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
                        <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        );
    }

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.5,
                    base64: false,
                    skipProcessing: true,
                });
                onCapture(photo.uri);
            } catch (error) {
                Alert.alert('Error', 'Failed to take photo');
            }
        }
    };

    return (
        <Modal visible={visible} animationType="fade">
            <View style={styles.container}>
                <CameraView
                    style={styles.camera}
                    facing="front"
                    ref={cameraRef}
                    onCameraReady={() => setIsReady(true)}
                >
                    <View style={styles.overlay}>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Feather name="x" size={24} color="white" />
                        </TouchableOpacity>

                        <View style={styles.faceFinder}>
                            <View style={styles.cornerTopLeft} />
                            <View style={styles.cornerTopRight} />
                            <View style={styles.cornerBottomLeft} />
                            <View style={styles.cornerBottomRight} />
                        </View>

                        <View style={styles.controls}>
                            <Text style={styles.hintText}>Position your face inside the frame</Text>
                            <TouchableOpacity
                                style={[styles.captureBtn, !isReady && styles.disabledBtn]}
                                onPress={takePicture}
                                disabled={!isReady}
                            >
                                <Feather name="camera" size={32} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </CameraView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    closeBtn: {
        position: 'absolute',
        top: 60,
        right: 24,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    faceFinder: {
        flex: 1,
        marginHorizontal: 54,
        marginVertical: 180,
        borderWidth: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cornerTopLeft: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#3b82f6', borderTopLeftRadius: 20 },
    cornerTopRight: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#3b82f6', borderTopRightRadius: 20 },
    cornerBottomLeft: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#3b82f6', borderBottomLeftRadius: 20 },
    cornerBottomRight: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#3b82f6', borderBottomRightRadius: 20 },
    controls: {
        position: 'absolute',
        bottom: 60,
        left: 0,
        right: 0,
        alignItems: 'center',
        gap: 24,
    },
    captureBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 6,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    disabledBtn: {
        backgroundColor: '#52525b',
    },
    hintText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        textShadowColor: 'black',
        textShadowRadius: 4,
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        gap: 20,
        backgroundColor: '#09090b',
    },
    permissionText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 18,
        lineHeight: 26,
    },
    button: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#27272a',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
