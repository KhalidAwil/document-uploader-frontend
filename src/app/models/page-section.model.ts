export interface SectionBullet {
    id: number;
    section_id: number;
    bullet_order: number;
    text: string;
    created_at?: string;
    updated_at?: string;
}

export interface GoalItem {
    id: number;
    section_id: number;
    item_order: number;
    heading: string;
    body_text: string;
    theme: 'primary' | 'secondary' | 'tertiary';
    created_at?: string;
    updated_at?: string;
}

export interface PageSection {
    id: number;
    page_type: 'homepage' | 'join_us';
    section_type: 'standard' | 'goals';
    section_order: number;
    heading: string;
    body_text: string | null;
    theme: 'primary' | 'secondary' | 'tertiary' | 'gradient-primary' | 'gradient-secondary';
    is_active: boolean;
    goal_items?: GoalItem[];
    bullets?: SectionBullet[];
    created_at?: string;
    updated_at?: string;
}

export interface CreateSectionRequest {
    page_type: 'homepage' | 'join_us';
    section_type?: 'standard' | 'goals';
    heading: string;
    body_text?: string;
    theme?: string;
    is_active?: boolean;
    bullets?: { text: string }[];
}

export interface UpdateSectionRequest {
    heading?: string;
    body_text?: string;
    theme?: string;
    is_active?: boolean;
}

export interface ReorderRequest {
    sections: { id: number; order: number }[];
}
