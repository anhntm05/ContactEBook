import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ContactPhotoPicker from "../components/contacts/ContactPhotoPicker";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import api from "../utils/api";
import { upsertContactMeta } from "../utils/contactMeta";
import {
  buildContactUploadFormData,
  validateContactPhotoFile,
} from "../utils/contactMedia";

const initialFormData = {
  displayName: "",
  firstName: "",
  lastName: "",
  company: "",
  jobTitle: "",
  phone: "",
  phoneLabel: "mobile",
  email: "",
  emailLabel: "personal",
  website: "",
  notes: "",
  favorite: false,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isBlank = (value) => !value || !value.trim();

const isValidHttpUrl = (value) => {
  if (isBlank(value)) return true;

  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeServerErrors = (error) => {
  const responseData = error?.response?.data;

  if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
    return responseData.errors.join(" ");
  }

  return (
    responseData?.message ||
    responseData?.error ||
    "Failed to create contact. Please try again."
  );
};

const buildPayload = (formData) => {
  const payload = {
    displayName: formData.displayName.trim(),
    favorite: formData.favorite,
  };

  const optionalStrings = [
    "firstName",
    "lastName",
    "company",
    "jobTitle",
    "website",
    "notes",
  ];

  optionalStrings.forEach((field) => {
    if (!isBlank(formData[field])) {
      payload[field] = formData[field].trim();
    }
  });

  if (!isBlank(formData.phone)) {
    payload.phones = [
      {
        label: formData.phoneLabel.trim() || "mobile",
        value: formData.phone.trim(),
        isPrimary: true,
      },
    ];
  }

  if (!isBlank(formData.email)) {
    payload.emails = [
      {
        label: formData.emailLabel.trim() || "personal",
        value: formData.email.trim(),
        isPrimary: !payload.phones,
      },
    ];
  }

  return payload;
};

const CreateContact = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");

  useEffect(
    () => () => {
      if (photoPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    },
    [photoPreviewUrl],
  );

  const contactMethodHint = useMemo(() => {
    if (!isBlank(formData.phone) || !isBlank(formData.email)) {
      return "Looks good: at least one contact method is provided.";
    }

    return "Provide at least one phone number or one email address.";
  }, [formData.phone, formData.email]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: null,
      general: null,
    }));
  };

  const setPreviewFromFile = (file) => {
    setPhotoPreviewUrl((prev) => {
      if (prev.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return file ? URL.createObjectURL(file) : "";
    });
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0] || null;
    const photoError = validateContactPhotoFile(file);

    if (photoError) {
      setErrors((prev) => ({
        ...prev,
        photo: photoError,
        general: null,
      }));
      event.target.value = "";
      return;
    }

    setPhotoFile(file);
    setPreviewFromFile(file);
    setErrors((prev) => ({
      ...prev,
      photo: null,
      general: null,
    }));
    event.target.value = "";
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPreviewFromFile(null);
    setErrors((prev) => ({
      ...prev,
      photo: null,
      general: null,
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (isBlank(formData.displayName)) {
      newErrors.displayName = "Display name is required";
    }

    if (isBlank(formData.phone) && isBlank(formData.email)) {
      newErrors.phone = "Provide at least one phone number or one email";
      newErrors.email = "Provide at least one phone number or one email";
    }

    if (!isBlank(formData.email) && !EMAIL_REGEX.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!isValidHttpUrl(formData.website)) {
      newErrors.website = "Website must be a valid URL (http or https)";
    }
    return newErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      const payload = buildPayload(formData);
      const requestData = buildContactUploadFormData(payload, photoFile);
      const response = await api.post("/contacts", requestData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      const createdContact = response.data?.data || response.data;
      const contactId = createdContact?._id || createdContact?.id;

      if (contactId) {
        upsertContactMeta(contactId, {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          company: formData.company.trim(),
          jobTitle: formData.jobTitle.trim(),
          phoneNumbers: isBlank(formData.phone)
            ? []
            : [
                {
                  number: formData.phone.trim(),
                  label: formData.phoneLabel.trim() || "mobile",
                },
              ],
          emails: isBlank(formData.email)
            ? []
            : [
                {
                  email: formData.email.trim(),
                  label: formData.emailLabel.trim() || "personal",
                },
              ],
          notes: formData.notes.trim(),
          favorite: formData.favorite,
        });
      }

      navigate("/dashboard", {
        state: { successMessage: "Contact created successfully." },
      });
    } catch (error) {
      setErrors({ general: normalizeServerErrors(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Create Contact
          </h1>
          <p className="text-gray-600 mb-6">
            Fill in the details below and click <strong>Save Contact</strong> to
            create a new contact.
          </p>

          {errors.general && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-3 gap-4">
              <Input
                label="Display Name"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="e.g. Jane Doe"
                required
                error={errors.displayName}
              />

              <Input
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Optional"
              />
              <Input
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Optional"
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. +1-555-0100"
                  error={errors.phone}
                />
              </div>
              <Input
                label="Phone Label"
                name="phoneLabel"
                value={formData.phoneLabel}
                onChange={handleChange}
                placeholder="mobile"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. jane@example.com"
                  error={errors.email}
                />
              </div>
              <Input
                label="Email Label"
                name="emailLabel"
                value={formData.emailLabel}
                onChange={handleChange}
                placeholder="personal"
              />
            </div>

            <p
              className={`text-sm mb-4 ${
                errors.phone ||
                errors.email ||
                (isBlank(formData.phone) && isBlank(formData.email))
                  ? "text-amber-700"
                  : "text-green-700"
              }`}
            >
              {contactMethodHint}
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="Optional"
              />
              <Input
                label="Job Title"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleChange}
                placeholder="Optional"
              />
            </div>

            <Input
              label="Website"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://example.com"
              error={errors.website}
            />

            <div className="mb-4">
              <ContactPhotoPicker
                imageUrl={photoPreviewUrl}
                displayName={formData.displayName}
                fileName={photoFile?.name || ""}
                error={errors.photo}
                onFileChange={handlePhotoChange}
                onRemove={handleRemovePhoto}
              />
            </div>

            <div className="mb-4">
              <label
                className="block text-gray-700 text-sm font-semibold mb-2"
                htmlFor="notes"
              >
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Optional notes"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="mb-4">
                <label
                  className="block text-gray-700 text-sm font-semibold mb-2"
                  htmlFor="favorite"
                >
                  Favorite
                </label>
                <label className="flex items-center gap-3 px-4 py-2 border border-gray-300 rounded-lg">
                  <input
                    id="favorite"
                    type="checkbox"
                    name="favorite"
                    checked={formData.favorite}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  <span className="text-gray-700">
                    Mark as favorite contact
                  </span>
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 mt-6 border-t-2 py-4 bg-white">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={loading}>
                Save Contact
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateContact;
