const MAX_CONTACT_PHOTO_SIZE = 5 * 1024 * 1024;

export const validateContactPhotoFile = (file) => {
  if (!file) return "";

  if (!file.type?.startsWith("image/")) {
    return "Please select an image file.";
  }

  if (file.size > MAX_CONTACT_PHOTO_SIZE) {
    return "Contact photo must be 5MB or smaller.";
  }

  return "";
};

export const buildContactUploadFormData = (payload, photoFile) => {
  const formData = new FormData();

  formData.append("payload", JSON.stringify(payload));

  if (photoFile) {
    formData.append("photo", photoFile);
  }

  return formData;
};

export { MAX_CONTACT_PHOTO_SIZE };
