// ============================================
// FIREBASE STORAGE SERVICE
// ============================================

import { STORAGE_PATHS } from '@/types/firebase.types';
import {
    deleteObject,
    getDownloadURL,
    listAll,
    ref,
    uploadBytes,
    uploadBytesResumable,
    UploadTaskSnapshot,
} from 'firebase/storage';
import { storage } from './firebase';

// ============================================
// HELPER FUNCTIONS
// ============================================

// Generate unique filename
const generateFileName = (originalName: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop() || 'jpg';
  return `${timestamp}_${random}.${extension}`;
};

// Convert URI to Blob (for React Native)
const uriToBlob = async (uri: string): Promise<Blob> => {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
};

// ============================================
// UPLOAD FUNCTIONS
// ============================================

export const storageService = {
  // Upload profile picture
  async uploadProfilePicture(
    userId: string,
    imageUri: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const fileName = generateFileName('profile.jpg');
    const storageRef = ref(storage, `${STORAGE_PATHS.PROFILE_PICTURES}/${userId}/${fileName}`);
    
    const blob = await uriToBlob(imageUri);
    
    if (onProgress) {
      const uploadTask = uploadBytesResumable(storageRef, blob);
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot: UploadTaskSnapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progress);
          },
          (error) => reject(error),
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          }
        );
      });
    } else {
      await uploadBytes(storageRef, blob);
      return getDownloadURL(storageRef);
    }
  },

  // Upload step proof image
  async uploadStepProof(
    userId: string,
    imageUri: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const fileName = generateFileName('step_proof.jpg');
    const storageRef = ref(storage, `${STORAGE_PATHS.STEP_PROOFS}/${userId}/${fileName}`);
    
    const blob = await uriToBlob(imageUri);
    
    if (onProgress) {
      const uploadTask = uploadBytesResumable(storageRef, blob);
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot: UploadTaskSnapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progress);
          },
          (error) => reject(error),
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          }
        );
      });
    } else {
      await uploadBytes(storageRef, blob);
      return getDownloadURL(storageRef);
    }
  },

  // Upload food image
  async uploadFoodImage(
    userId: string,
    imageUri: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const fileName = generateFileName('food.jpg');
    const storageRef = ref(storage, `${STORAGE_PATHS.FOOD_IMAGES}/${userId}/${fileName}`);
    
    const blob = await uriToBlob(imageUri);
    
    if (onProgress) {
      const uploadTask = uploadBytesResumable(storageRef, blob);
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot: UploadTaskSnapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progress);
          },
          (error) => reject(error),
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          }
        );
      });
    } else {
      await uploadBytes(storageRef, blob);
      return getDownloadURL(storageRef);
    }
  },

  // Upload exercise proof
  async uploadExerciseProof(
    userId: string,
    imageUri: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const fileName = generateFileName('exercise.jpg');
    const storageRef = ref(storage, `${STORAGE_PATHS.EXERCISE_PROOFS}/${userId}/${fileName}`);
    
    const blob = await uriToBlob(imageUri);
    
    if (onProgress) {
      const uploadTask = uploadBytesResumable(storageRef, blob);
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot: UploadTaskSnapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progress);
          },
          (error) => reject(error),
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          }
        );
      });
    } else {
      await uploadBytes(storageRef, blob);
      return getDownloadURL(storageRef);
    }
  },

  // Upload message attachment
  async uploadMessageAttachment(
    conversationId: string,
    fileUri: string,
    fileName: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const uniqueFileName = generateFileName(fileName);
    const storageRef = ref(storage, `${STORAGE_PATHS.MESSAGE_ATTACHMENTS}/${conversationId}/${uniqueFileName}`);
    
    const blob = await uriToBlob(fileUri);
    
    if (onProgress) {
      const uploadTask = uploadBytesResumable(storageRef, blob);
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot: UploadTaskSnapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progress);
          },
          (error) => reject(error),
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          }
        );
      });
    } else {
      await uploadBytes(storageRef, blob);
      return getDownloadURL(storageRef);
    }
  },

  // Generic upload function
  async upload(
    path: string,
    fileUri: string,
    fileName: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const uniqueFileName = generateFileName(fileName);
    const storageRef = ref(storage, `${path}/${uniqueFileName}`);
    
    const blob = await uriToBlob(fileUri);
    
    if (onProgress) {
      const uploadTask = uploadBytesResumable(storageRef, blob);
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot: UploadTaskSnapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progress);
          },
          (error) => reject(error),
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          }
        );
      });
    } else {
      await uploadBytes(storageRef, blob);
      return getDownloadURL(storageRef);
    }
  },

  // ============================================
  // DELETE FUNCTIONS
  // ============================================

  // Delete file by URL
  async deleteByUrl(fileUrl: string): Promise<void> {
    try {
      // Extract path from URL
      const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/';
      if (fileUrl.includes(baseUrl)) {
        const pathStart = fileUrl.indexOf('/o/') + 3;
        const pathEnd = fileUrl.indexOf('?');
        const encodedPath = fileUrl.substring(pathStart, pathEnd);
        const path = decodeURIComponent(encodedPath);
        const fileRef = ref(storage, path);
        await deleteObject(fileRef);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  },

  // Delete file by path
  async deleteByPath(path: string): Promise<void> {
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
  },

  // Delete all files in a folder
  async deleteFolder(folderPath: string): Promise<void> {
    const folderRef = ref(storage, folderPath);
    const result = await listAll(folderRef);
    
    const deletePromises = result.items.map(item => deleteObject(item));
    await Promise.all(deletePromises);
    
    // Recursively delete subfolders
    const subfolderPromises = result.prefixes.map(prefix => 
      this.deleteFolder(prefix.fullPath)
    );
    await Promise.all(subfolderPromises);
  },

  // Delete all user files (for account deletion)
  async deleteUserFiles(userId: string): Promise<void> {
    const paths = [
      `${STORAGE_PATHS.PROFILE_PICTURES}/${userId}`,
      `${STORAGE_PATHS.STEP_PROOFS}/${userId}`,
      `${STORAGE_PATHS.FOOD_IMAGES}/${userId}`,
      `${STORAGE_PATHS.EXERCISE_PROOFS}/${userId}`,
    ];
    
    const deletePromises = paths.map(path => 
      this.deleteFolder(path).catch(() => {}) // Ignore errors if folder doesn't exist
    );
    await Promise.all(deletePromises);
  },

  // ============================================
  // GET URL FUNCTIONS
  // ============================================

  // Get download URL for a path
  async getUrl(path: string): Promise<string> {
    const fileRef = ref(storage, path);
    return getDownloadURL(fileRef);
  },

  // List all files in a folder
  async listFiles(folderPath: string): Promise<string[]> {
    const folderRef = ref(storage, folderPath);
    const result = await listAll(folderRef);
    
    const urlPromises = result.items.map(item => getDownloadURL(item));
    return Promise.all(urlPromises);
  },
};

export default storageService;
