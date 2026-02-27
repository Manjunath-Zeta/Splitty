import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Keyboard } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedReaction,
    withSpring,
    withTiming,
    runOnJS,
    scrollTo,
    useAnimatedRef,
    SharedValue,
    AnimatedRef,
    useAnimatedStyle
} from 'react-native-reanimated';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { GripVertical } from 'lucide-react-native';
import { useSplittyStore } from '../store/useSplittyStore';
import { CategoryIcon } from './CategoryIcon';

interface DraggableCategoryProps {
    categoryIds: string[];
    onOrderChange: (newOrder: string[]) => void;
    renderItemContent: (categoryId: string) => React.ReactNode;
    itemHeight?: number;
}

function clamp(value: number, lowerBound: number, upperBound: number) {
    'worklet';
    return Math.max(lowerBound, Math.min(value, upperBound));
}

function objectMove(object: { [id: string]: number }, from: number, to: number) {
    'worklet';
    const newObject: { [id: string]: number } = {};
    for (const id in object) {
        if (object[id] === from) {
            newObject[id] = to;
        } else if (object[id] === to) {
            newObject[id] = from;
        } else {
            newObject[id] = object[id];
        }
    }
    return newObject;
}

const dismissKeyboard = () => {
    Keyboard.dismiss();
};

function DraggableItem({
    id,
    initialPosition,
    totalItems,
    positions,
    itemHeight,
    children,
    colors,
    scrollY,
    containerHeight,
    scrollViewRef
}: {
    id: string;
    initialPosition: number;
    totalItems: number;
    positions: SharedValue<{ [id: string]: number }>;
    itemHeight: number;
    children: React.ReactNode;
    colors: any;
    scrollY: SharedValue<number>;
    containerHeight: number;
    scrollViewRef: AnimatedRef<ScrollView>;
}) {
    const isDragging = useSharedValue(false);
    const top = useSharedValue(initialPosition * itemHeight);
    const zIndex = useSharedValue(0);

    useAnimatedReaction(
        () => positions.value[id],
        (currentPosition, previousPosition) => {
            if (currentPosition !== previousPosition) {
                if (!isDragging.value) {
                    top.value = withSpring(currentPosition * itemHeight, {
                        damping: 18,
                        stiffness: 150
                    });
                }
            }
        },
        [isDragging]
    );

    const panGesture = Gesture.Pan()
        .activateAfterLongPress(200) // Ensure normal touches (like inputs) work
        .onStart(() => {
            isDragging.value = true;
            zIndex.value = 100;
            top.value = positions.value[id] * itemHeight;
            runOnJS(dismissKeyboard)();
        })
        .onUpdate((e) => {
            // Restrict dragging bounds
            const maxDragOffset = totalItems * itemHeight - itemHeight;
            const newTop = clamp(
                positions.value[id] * itemHeight + e.translationY,
                0,
                maxDragOffset
            );

            top.value = newTop;

            // Simple auto-scroll check
            if (e.absoluteY > containerHeight - 100) {
                scrollTo(scrollViewRef, 0, scrollY.value + 10, false);
            } else if (e.absoluteY < 150 && scrollY.value > 0) {
                scrollTo(scrollViewRef, 0, scrollY.value - 10, false);
            }

            // Calculate current index based on position
            const newPosition = clamp(Math.round(newTop / itemHeight), 0, totalItems - 1);

            if (newPosition !== positions.value[id]) {
                positions.value = objectMove(positions.value, positions.value[id], newPosition);
            }
        })
        .onEnd(() => {
            top.value = withSpring(positions.value[id] * itemHeight, {
                damping: 18,
                stiffness: 150
            });
        })
        .onFinalize(() => {
            isDragging.value = false;
            zIndex.value = 0;
        });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            position: 'absolute',
            left: 0,
            right: 0,
            top: top.value,
            zIndex: zIndex.value,
            transform: [{ scale: withTiming(isDragging.value ? 1.02 : 1, { duration: 150 }) }],
            shadowOpacity: withTiming(isDragging.value ? 0.2 : 0, { duration: 150 }),
        };
    });

    return (
        <Animated.View style={[animatedStyle, styles.draggableItem]}>
            <View style={styles.contentContainer}>
                {children}
            </View>
            <GestureDetector gesture={panGesture}>
                <View style={styles.dragHandle}>
                    <GripVertical size={20} color={colors.textSecondary} />
                </View>
            </GestureDetector>
        </Animated.View>
    );
}

export function DraggableCategoryList({
    categoryIds,
    onOrderChange,
    renderItemContent,
    itemHeight = 90
}: DraggableCategoryProps) {
    const { colors } = useSplittyStore();
    const [containerHeight, setContainerHeight] = useState(0);
    const scrollViewRef = useAnimatedRef<ScrollView>();
    const scrollY = useSharedValue(0);

    // Initialize positions dictionary: { 'cat-id-1': 0, 'cat-id-2': 1, ... }
    const initialPositions = categoryIds.reduce((acc, id, index) => {
        acc[id] = index;
        return acc;
    }, {} as { [id: string]: number });

    const positions = useSharedValue(initialPositions);

    // Sync state back to parent when dragging finishes naturally
    useAnimatedReaction(
        () => positions.value,
        (currentPos, prevPos) => {
            if (prevPos && JSON.stringify(currentPos) !== JSON.stringify(prevPos)) {
                // We cannot call React Native state functions directly from worklets,
                // so we use a JS callback. But we debounce it slightly so we don't spam.
                const newOrder = Object.keys(currentPos).sort((a, b) => currentPos[a] - currentPos[b]);
                runOnJS(onOrderChange)(newOrder);
            }
        }
    );

    return (
        <ScrollView
            ref={scrollViewRef}
            style={styles.container}
            contentContainerStyle={{ height: categoryIds.length * itemHeight + 150 }}
            scrollEventThrottle={16}
            onScroll={(e) => {
                scrollY.value = e.nativeEvent.contentOffset.y;
            }}
            onLayout={(e) => {
                setContainerHeight(e.nativeEvent.layout.height);
            }}
            keyboardShouldPersistTaps="handled"
        >
            <View style={{ height: categoryIds.length * itemHeight, position: 'relative' }}>
                {categoryIds.map((id) => (
                    <DraggableItem
                        key={id}
                        id={id}
                        initialPosition={initialPositions[id]}
                        totalItems={categoryIds.length}
                        positions={positions}
                        itemHeight={itemHeight}
                        colors={colors}
                        scrollY={scrollY}
                        containerHeight={containerHeight}
                        scrollViewRef={scrollViewRef}
                    >
                        {renderItemContent(id)}
                    </DraggableItem>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    draggableItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 0,
        backgroundColor: 'transparent',
    },
    contentContainer: {
        flex: 1,
        paddingRight: 10,
    },
    dragHandle: {
        padding: 15,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.6,
    }
});
