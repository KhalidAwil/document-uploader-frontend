import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
    PageSection,
    GoalItem,
    SectionBullet,
    CreateSectionRequest,
    UpdateSectionRequest,
    ReorderRequest
} from '../models/page-section.model';

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

@Injectable({
    providedIn: 'root'
})
export class PageSectionService {
    private apiUrl = `${environment.apiUrl}/sections`;
    private adminApiUrl = `${environment.apiUrl}/admin/sections`;

    constructor(private http: HttpClient) { }

    /**
     * Get public sections for a page (used by homepage/join-us display)
     */
    getSections(pageType: 'homepage' | 'join_us'): Observable<ApiResponse<PageSection[]>> {
        const params = new HttpParams().set('page_type', pageType);
        return this.http.get<ApiResponse<PageSection[]>>(this.apiUrl, { params });
    }

    /**
     * Get all sections for admin (including inactive)
     */
    getAdminSections(pageType: 'homepage' | 'join_us'): Observable<ApiResponse<PageSection[]>> {
        const params = new HttpParams().set('page_type', pageType);
        return this.http.get<ApiResponse<PageSection[]>>(this.adminApiUrl, { params });
    }

    /**
     * Create a new section
     */
    createSection(request: CreateSectionRequest): Observable<ApiResponse<PageSection>> {
        return this.http.post<ApiResponse<PageSection>>(this.apiUrl, request);
    }

    /**
     * Update a section
     */
    updateSection(id: number, request: UpdateSectionRequest): Observable<ApiResponse<PageSection>> {
        return this.http.put<ApiResponse<PageSection>>(`${this.apiUrl}/${id}`, request);
    }

    /**
     * Delete a section
     */
    deleteSection(id: number): Observable<ApiResponse<void>> {
        return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
    }

    /**
     * Reorder sections
     */
    reorderSections(request: ReorderRequest): Observable<ApiResponse<void>> {
        return this.http.post<ApiResponse<void>>(`${this.apiUrl}/reorder`, request);
    }

    /**
     * Update a goal item
     */
    updateGoalItem(sectionId: number, itemId: number, data: { heading?: string; body_text?: string }): Observable<ApiResponse<GoalItem>> {
        return this.http.put<ApiResponse<GoalItem>>(`${this.apiUrl}/${sectionId}/goals/${itemId}`, data);
    }

    /**
     * Add a bullet to a section
     */
    addBullet(sectionId: number, text: string): Observable<ApiResponse<SectionBullet>> {
        return this.http.post<ApiResponse<SectionBullet>>(`${this.apiUrl}/${sectionId}/bullets`, { text });
    }

    /**
     * Update a bullet
     */
    updateBullet(sectionId: number, bulletId: number, text: string): Observable<ApiResponse<SectionBullet>> {
        return this.http.put<ApiResponse<SectionBullet>>(`${this.apiUrl}/${sectionId}/bullets/${bulletId}`, { text });
    }

    /**
     * Delete a bullet
     */
    deleteBullet(sectionId: number, bulletId: number): Observable<ApiResponse<void>> {
        return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${sectionId}/bullets/${bulletId}`);
    }
}
