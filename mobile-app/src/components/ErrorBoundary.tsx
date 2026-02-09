import React, { ErrorInfo, ReactNode } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Global App Error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <View style={styles.content}>
                        <View style={styles.iconBox}>
                            <AlertCircle size={48} color="#ef4444" />
                        </View>
                        <Text style={styles.title}>Something went wrong</Text>
                        <Text style={styles.message}>
                            The application encountered an unexpected error. We've logged the issue and are working on it.
                        </Text>

                        <View style={styles.errorBox}>
                            <Text style={styles.errorText} numberOfLines={3}>
                                {this.state.error?.message || 'Unknown runtime error'}
                            </Text>
                        </View>

                        <TouchableOpacity style={styles.button} onPress={this.handleReset}>
                            <RefreshCw size={20} color="#fff" />
                            <Text style={styles.buttonText}>Restart Component</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#09090b',
        justifyContent: 'center',
        padding: 24,
    },
    content: {
        alignItems: 'center',
        gap: 16,
    },
    iconBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#ef444410',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    message: {
        color: '#a1a1aa',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    errorBox: {
        width: '100%',
        backgroundColor: '#18181b',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#27272a',
    },
    errorText: {
        color: '#f87171',
        fontSize: 12,
        fontFamily: 'monospace',
    },
    button: {
        flexDirection: 'row',
        backgroundColor: '#2563eb',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        gap: 12,
        marginTop: 12,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
