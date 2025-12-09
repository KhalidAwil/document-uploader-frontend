import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environment';
import { PaginatedResponse } from './document.service';

@Injectable({
  providedIn: 'root',
})

export class HomepageService {
  private apiUrl = `${environment.apiUrl}/carousel-images`;

  constructor(private http: HttpClient) {}

  getCarouselImages(): Observable<CarouselImage[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        // Check if response has a data property (PaginatedResponse)
        if (response && response.data) {
          return response.data as CarouselImage[];
        }
        // Otherwise, assume it's already a CarouselImage array
        return response as CarouselImage[];
      })
    );
  }

  addCarouselImage(imageUrl: string): Observable<any> {
    return this.http.post<CarouselImage>(this.apiUrl, { image_url: imageUrl }, {withCredentials: true});
  }

  updateCarouselImage(id: number, imageUrl: string): Observable<any> {
    return this.http.put<CarouselImage>(`${this.apiUrl}/${id}`, { image_url: imageUrl }, {withCredentials: true});
  }

  deleteCarouselImage(id: number): Observable<CarouselImage> {
    return this.http.delete<CarouselImage>(`${this.apiUrl}/${id}`, {withCredentials: true});
  }
}

export interface CarouselImage {
  id?: number;
  image_url: string;
}
