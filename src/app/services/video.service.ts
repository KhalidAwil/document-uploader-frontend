import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { NgbTimeStruct } from '@ng-bootstrap/ng-bootstrap';

@Injectable({
  providedIn: 'root'
})
export class VideoService {
  private proxyUrl = `${environment.apiUrl}/youtube/video`;

  constructor(private http: HttpClient) {}

  /**
   * Fetch video duration from YouTube API via backend proxy
   * @param videoId YouTube video ID
   * @returns Observable<NgbTimeStruct | null> Duration in NgbTimeStruct format or null if invalid
   */
  getVideoDuration(videoId: string): Observable<NgbTimeStruct | null> {
    console.log('Making YouTube API request via proxy for video:', videoId);
    return this.http.get<any>(this.proxyUrl, {
      params: { video_id: videoId }
    }).pipe(
      map(response => {
        console.log('YouTube API response received:', response);
        console.log('Response has items:', !!(response.items && response.items.length > 0));
        if (response.items && response.items.length > 0) {
          const duration = response.items[0].contentDetails.duration;
          console.log('Raw duration from API:', duration);
          const parsedDuration = this.parseDuration(duration);
          console.log('Parsed duration result:', parsedDuration);
          return parsedDuration;
        }
        console.warn('No video items found for ID:', videoId);
        return null;
      }),
      catchError(error => {
        console.error('Error fetching YouTube video duration:', error);
        return throwError(() => new Error('Failed to fetch video duration'));
      })
    );
  }

  /**
   * Parse ISO 8601 duration (e.g., PT5M30S) to NgbTimeStruct
   * @param duration ISO 8601 duration string
   * @returns NgbTimeStruct or null if invalid
   */
  private parseDuration(duration: string): NgbTimeStruct | null {
    if (!duration) {
      console.warn('Empty duration received');
      return null;
    }

    // Regular expression to parse ISO 8601 duration
    const regex = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const matches = duration.match(regex);

    if (!matches) {
      console.warn('Invalid ISO 8601 duration format:', duration);
      return null;
    }

    const days = parseInt(matches[1] || '0', 10);
    const hours = parseInt(matches[2] || '0', 10);
    const minutes = parseInt(matches[3] || '0', 10);
    const seconds = parseInt(matches[4] || '0', 10);

    // Convert days to hours
    const totalHours = days * 24 + hours;

    // Clamp values to valid ranges for NgbTimeStruct
    if (totalHours > 23) {
      console.warn('Video duration exceeds 23 hours, clamping to 23:', duration);
      return { hour: 23, minute: minutes, second: seconds };
    }
    if (minutes > 59) {
      console.warn('Minutes exceed 59, clamping to 59:', duration);
      return { hour: totalHours, minute: 59, second: seconds };
    }
    if (seconds > 59) {
      console.warn('Seconds exceed 59, clamping to 59:', duration);
      return { hour: totalHours, minute: minutes, second: 59 };
    }

    return { hour: totalHours, minute: minutes, second: seconds };
  }

  /**
   * Upload a video file to the server
   * @param file Video file to upload
   * @returns Promise containing the uploaded video details
   */
  uploadVideo(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('video', file);

    return this.http.post(`${environment.apiUrl}/videos/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    }).toPromise();
  }

  /**
   * Get video processing status
   * @param videoId ID of the video to check
   * @returns Observable containing the processing status
   */
  getVideoStatus(videoId: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/videos/status/${videoId}`);
  }

  /**
   * Generate a thumbnail for a video
   * @param videoId ID of the video
   * @param time Time in seconds to generate thumbnail from
   * @returns Observable containing the thumbnail URL
   */
  generateThumbnail(videoId: string, time: number): Observable<string> {
    return this.http.post<string>(`${environment.apiUrl}/videos/thumbnail/${videoId}`, { time });
  }

  /**
   * Extract audio from video
   * @param videoId ID of the video
   * @returns Observable containing the audio file URL
   */
  extractAudio(videoId: string): Observable<string> {
    return this.http.post<string>(`${environment.apiUrl}/videos/audio/${videoId}`, {});
  }

  /**
   * Get video metadata
   * @param videoId ID of the video
   * @returns Observable containing video metadata
   */
  getVideoMetadata(videoId: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/videos/metadata/${videoId}`);
  }
}
