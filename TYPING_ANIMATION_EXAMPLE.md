# Animated Typing Indicator for React Native (WhatsApp Style)

## The Backend is Already Configured ✅

Your Socket.IO server already emits:
- `user_typing` when someone starts typing
- `user_stop_typing` when someone stops typing

## Frontend Implementation (React Native)

### 1. Create Animated Typing Dots Component

```tsx
// components/TypingIndicator.tsx
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

export const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation = Animated.parallel([
      animateDot(dot1, 0),
      animateDot(dot2, 150),
      animateDot(dot3, 300),
    ]);

    animation.start();

    return () => animation.stop();
  }, []);

  const animatedStyle = (dot: Animated.Value) => ({
    opacity: dot.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        translateY: dot.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -6],
        }),
      },
    ],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.dot, animatedStyle(dot1)]} />
      <Animated.View style={[styles.dot, animatedStyle(dot2)]} />
      <Animated.View style={[styles.dot, animatedStyle(dot3)]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    marginLeft: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#999',
    marginHorizontal: 2,
  },
});
```

### 2. Integrate in Your Chat Screen

```tsx
// screens/ChatScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TypingIndicator } from '../components/TypingIndicator';
import { socket } from '../services/socket'; // Your socket service

export const ChatScreen = ({ route }) => {
  const { otherUserId, otherUserName } = route.params;
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Listen for typing events
    socket.on('user_typing', ({ userId }) => {
      if (userId === otherUserId) {
        setIsTyping(true);
        
        // Auto-hide after 3 seconds if no stop_typing received
        if (typingTimeout) clearTimeout(typingTimeout);
        const timeout = setTimeout(() => setIsTyping(false), 3000);
        setTypingTimeout(timeout);
      }
    });

    socket.on('user_stop_typing', ({ userId }) => {
      if (userId === otherUserId) {
        setIsTyping(false);
        if (typingTimeout) clearTimeout(typingTimeout);
      }
    });

    return () => {
      socket.off('user_typing');
      socket.off('user_stop_typing');
      if (typingTimeout) clearTimeout(typingTimeout);
    };
  }, [otherUserId, typingTimeout]);

  return (
    <View style={styles.container}>
      {/* Your messages list */}
      
      {/* Typing indicator at bottom */}
      {isTyping && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>{otherUserName} is typing</Text>
          <TypingIndicator />
        </View>
      )}
      
      {/* Your message input */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF',
  },
  typingText: {
    fontSize: 13,
    color: '#666',
    marginRight: 8,
  },
});
```

### 3. Emit Typing Events When User Types

```tsx
// In your message input component
import { socket } from '../services/socket';

const MessageInput = ({ receiverId }) => {
  const [message, setMessage] = useState('');
  const [isCurrentlyTyping, setIsCurrentlyTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTextChange = (text: string) => {
    setMessage(text);

    // Emit typing event
    if (!isCurrentlyTyping && text.length > 0) {
      socket.emit('typing', { receiverId });
      setIsCurrentlyTyping(true);
    }

    // Reset timeout for stop_typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-send stop_typing after 1 second of no typing
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { receiverId });
      setIsCurrentlyTyping(false);
    }, 1000);
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      // Send message
      socket.emit('send_message', {
        receiverId,
        content: message,
      });

      // Stop typing indicator
      socket.emit('stop_typing', { receiverId });
      setIsCurrentlyTyping(false);
      
      setMessage('');
    }
  };

  return (
    <TextInput
      value={message}
      onChangeText={handleTextChange}
      placeholder="Type a message..."
      onSubmitEditing={handleSendMessage}
    />
  );
};
```

## Manager Not Seeing Staff - Fix

**The issue is database-level, not backend code.**

Check if both users have the same `branch_id`:

```bash
# Connect to your database and run:
SELECT id, name, role, branch_id, branch_context 
FROM users 
WHERE role IN ('manager', 'staff');
```

**If they have different branch_ids:**

```sql
-- Update staff to be in same branch as manager
UPDATE users 
SET branch_id = (SELECT branch_id FROM users WHERE role = 'manager' LIMIT 1)
WHERE role = 'staff' AND id = 'STAFF_USER_ID_HERE';
```

Then both users need to **reconnect** (close and reopen the app) for the Socket.IO connection to join the correct branch room.
