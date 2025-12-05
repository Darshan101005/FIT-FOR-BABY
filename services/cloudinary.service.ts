// ============================================
// CLOUDINARY SERVICE
// Free tier: 25GB storage, 25GB bandwidth/month
// ============================================

import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// Cloudinary Configuration
const CLOUDINARY_CONFIG = {
  cloudName: 'dkkfzzwzn',
  uploadPreset: 'fit_for_baby',
};

const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;

// ============================================
// UPLOAD FUNCTIONS
// ============================================

export const cloudinaryService = {
  /**
   * Upload an image to Cloudinary
   * @param imageUri - Local image URI (from camera or gallery)
   * @param folder - Folder name in Cloudinary (e.g., 'step_proofs', 'food_images')
   * @param onProgress - Optional progress callback
   * @returns Promise<string> - The secure URL of the uploaded image
   */
  async uploadImage(
    imageUri: string,
    folder: string = 'general',
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      if (Platform.OS === 'web') {
        // Web: Use blob approach
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        const formData = new FormData();
        formData.append('file', blob, `upload_${Date.now()}.jpg`);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('folder', folder);

        const uploadResponse = await fetch(CLOUDINARY_UPLOAD_URL, {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed with status ${uploadResponse.status}`);
        }

        const result = await uploadResponse.json();
        return result.secure_url;
      } else {
        // Mobile (iOS/Android): Use expo-file-system uploadAsync
        // This is the most reliable way for React Native
        onProgress?.(10); // Start progress
        
        const uploadResult = await FileSystem.uploadAsync(
          CLOUDINARY_UPLOAD_URL,
          imageUri,
          {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'file',
            parameters: {
              upload_preset: CLOUDINARY_CONFIG.uploadPreset,
              folder: folder,
            },
          }
        );

        onProgress?.(100); // Complete

        if (uploadResult.status !== 200) {
          console.error('Cloudinary upload failed:', uploadResult.body);
          throw new Error(`Upload failed with status ${uploadResult.status}`);
        }

        const result = JSON.parse(uploadResult.body);
        return result.secure_url;
      }
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw error;
    }
  },

  /**
   * Upload step proof image
   */
  async uploadStepProof(
    userId: string,
    imageUri: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return this.uploadImage(imageUri, `Step-Counts/${userId}`, onProgress);
  },

  /**
   * Upload food image
   */
  async uploadFoodImage(
    userId: string,
    imageUri: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return this.uploadImage(imageUri, `food_images/${userId}`, onProgress);
  },

  /**
   * Upload exercise proof image
   */
  async uploadExerciseProof(
    userId: string,
    imageUri: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return this.uploadImage(imageUri, `exercise_proofs/${userId}`, onProgress);
  },

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(
    userId: string,
    imageUri: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return this.uploadImage(imageUri, `Profile/${userId}`, onProgress);
  },

  /**
   * Get optimized image URL (smaller size for thumbnails)
   */
  getOptimizedUrl(url: string, width: number = 400, height: number = 300): string {
    if (!url || !url.includes('cloudinary.com')) {
      return url;
    }
    return url.replace('/upload/', `/upload/c_fill,w_${width},h_${height},q_auto,f_auto/`);
  },

  /**
   * Get thumbnail URL
   */
  getThumbnailUrl(url: string): string {
    return this.getOptimizedUrl(url, 150, 150);
  },

  /**
   * Add cache busting parameter to URL to force reload
   */
  getCacheBustedUrl(url: string): string {
    if (!url) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}`;
  },
};

export default cloudinaryService;
