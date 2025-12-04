// ============================================
// CLOUDINARY SERVICE
// Free tier: 25GB storage, 25GB bandwidth/month
// ============================================

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
      // Fetch the image and get as blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Create form data
      const formData = new FormData();
      
      // Append blob directly - works for both web and mobile
      formData.append('file', blob, `upload_${Date.now()}.jpg`);
      formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
      formData.append('folder', `fit_for_baby/${folder}`);

      // Upload using XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const result = JSON.parse(xhr.responseText);
            resolve(result.secure_url);
          } else {
            console.error('Cloudinary upload failed:', xhr.responseText);
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error during upload'));
        };

        xhr.open('POST', CLOUDINARY_UPLOAD_URL);
        xhr.send(formData);
      });
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
    return this.uploadImage(imageUri, `step_proofs/${userId}`, onProgress);
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
    return this.uploadImage(imageUri, `profile_pictures/${userId}`, onProgress);
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
};

export default cloudinaryService;
