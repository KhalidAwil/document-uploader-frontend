import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, map, mergeMap, from, concat, of } from 'rxjs';
import { environment } from '../../environment';

export interface UploadResponse {
  message: string;
  filePath: string;
  fileUrl: string;
}

export interface ChunkUploadResponse {
  message: string;
  chunkIndex: number;
  totalChunks: number;
  uploadId?: string;
  filePath?: string;
  fileUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class FileUploadService {
  private apiUrl = environment.apiUrl;
  private readonly CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks
  private readonly LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB for chunking
  private readonly IMAGE_COMPRESSION_QUALITY = 0.8;
  private readonly MAX_IMAGE_WIDTH = 1920;
  private readonly MAX_IMAGE_HEIGHT = 1080;

  constructor(private http: HttpClient) {}

  uploadFile(
    file: File,
    context: string = 'default',
    reportProgress: boolean = true
  ): Observable<HttpEvent<UploadResponse>> {
    // Temporarily disable chunked upload until backend endpoint is available
    // For large files, use chunked upload
    // if (file.size > this.LARGE_FILE_THRESHOLD) {
    //   return this.uploadFileInChunks(file, context);
    // }

    // For images, compress before upload
    if (file.type.startsWith('image/') && file.size > 5 * 1024 * 1024) { // 5MB+
      return from(this.compressImage(file)).pipe(
        mergeMap(compressedFile => this.uploadSingleFile(compressedFile, context, reportProgress))
      );
    }

    return this.uploadSingleFile(file, context, reportProgress);
  }

  private uploadSingleFile(
    file: File,
    context: string = 'default',
    reportProgress: boolean = true
  ): Observable<HttpEvent<UploadResponse>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('context', context);

    return this.http.post<UploadResponse>(
      `${this.apiUrl}/upload`,
      formData,
      {
        withCredentials: true,
        reportProgress,
        observe: 'events'
      }
    );
  }

  private uploadFileInChunks(file: File, context: string): Observable<HttpEvent<UploadResponse>> {
    const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);
    const uploadId = this.generateUploadId();
    
    return new Observable(observer => {
      let uploadedBytes = 0;
      let currentChunk = 0;
      
      const uploadNextChunk = () => {
        if (currentChunk >= totalChunks) {
          // Final response
          observer.next({
            type: HttpEventType.Response,
            body: {
              message: 'Upload completed',
              filePath: `uploads/${file.name}`,
              fileUrl: `${environment.fileUploadUrl}/uploads/${file.name}`
            }
          } as HttpEvent<UploadResponse>);
          observer.complete();
          return;
        }

        const start = currentChunk * this.CHUNK_SIZE;
        const end = Math.min(start + this.CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        
        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('chunkIndex', currentChunk.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('uploadId', uploadId);
        formData.append('fileName', file.name);
        formData.append('context', context);
        
        this.http.post<ChunkUploadResponse>(
          `${this.apiUrl}/upload-chunk`,
          formData,
          { withCredentials: true, reportProgress: true, observe: 'events' }
        ).subscribe({
          next: (event) => {
            if (event.type === HttpEventType.UploadProgress && event.total) {
              const chunkProgress = (event.loaded / event.total) * this.CHUNK_SIZE;
              const totalProgress = Math.round(((uploadedBytes + chunkProgress) / file.size) * 100);
              
              observer.next({
                type: HttpEventType.UploadProgress,
                loaded: uploadedBytes + chunkProgress,
                total: file.size
              } as HttpEvent<UploadResponse>);
            }
            
            if (event.type === HttpEventType.Response) {
              uploadedBytes += this.CHUNK_SIZE;
              currentChunk++;
              uploadNextChunk();
            }
          },
          error: (error) => observer.error(error)
        });
      };
      
      uploadNextChunk();
    });
  }

  private async compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        try {
          // Calculate new dimensions
          let { width, height } = img;
          
          if (width > this.MAX_IMAGE_WIDTH || height > this.MAX_IMAGE_HEIGHT) {
            const ratio = Math.min(this.MAX_IMAGE_WIDTH / width, this.MAX_IMAGE_HEIGHT / height);
            width *= ratio;
            height *= ratio;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress
          if (!ctx) {
            console.warn('Canvas context not available, using original file');
            resolve(file);
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob && blob.size < file.size) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              console.log(`Image compressed: ${file.size} -> ${blob.size} bytes`);
              resolve(compressedFile);
            } else {
              console.log('Compression not beneficial, using original file');
              resolve(file); // Use original if compression didn't help
            }
          }, file.type, this.IMAGE_COMPRESSION_QUALITY);
        } catch (error) {
          console.error('Image compression failed:', error);
          resolve(file); // Fallback to original
        } finally {
          URL.revokeObjectURL(img.src);
        }
      };
      
      img.onerror = (error) => {
        console.error('Image loading failed:', error);
        URL.revokeObjectURL(img.src);
        resolve(file); // Fallback to original
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  private generateUploadId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  deleteFile(filePath: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/delete`,
      {
        withCredentials: true,
        params: { filePath: filePath }
      }
    );
  }
}