import React from 'react';
import * as LucideIcons from 'lucide-react-native';
import { ViewStyle, StyleProp } from 'react-native';

interface Props {
    name: string;
    size?: number;
    color?: string;
    style?: StyleProp<ViewStyle>;
}

export function CategoryIcon({ name, size = 24, color = '#000', style }: Props) {
    const Icon = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
    return <Icon size={size} color={color} style={style} />;
}
