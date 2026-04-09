import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ContactPhotoPicker from "../components/contacts/ContactPhotoPicker";
import FavoriteToggle from "../components/contacts/FavoriteToggle";
import Button from "../components/common/Button";
import ToastMessage from "../components/common/ToastMessage";
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
  tagsText: "",
  notes: "",
  favorite: false,
};

const isBlank = (value) => !value || !value.trim();

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

const getServerFieldErrors = (error) => {
  const fieldErrors = error?.response?.data?.fieldErrors;
  return fieldErrors && typeof fieldErrors === "object" ? fieldErrors : {};
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

  const tags = formData.tagsText
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (tags.length > 0) {
    payload.tags = tags;
  }

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

const inputClassName = (error) =>
  `w-full rounded-lg border px-3 py-2 text-slate-800 outline-none transition focus:ring-2 focus:ring-blue-200 ${
    error ? "border-red-400" : "border-slate-300"
  }`;

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

  const handleResetForm = () => {
    setFormData(initialFormData);
    setErrors({});
    setPhotoFile(null);
    setPreviewFromFile(null);
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
          tags: formData.tagsText
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
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

      navigate("/contacts", {
        state: { successMessage: "Contact created successfully." },
      });
    } catch (error) {
      const fieldErrors = getServerFieldErrors(error);

      setErrors({
        ...fieldErrors,
        general:
          Object.keys(fieldErrors).length > 0
            ? null
            : normalizeServerErrors(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <ToastMessage
        message={errors.general}
        type="error"
        onClose={() =>
          setErrors((prev) => ({
            ...prev,
            general: null,
          }))
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="container mx-auto max-w-7xl space-y-6 px-4 py-8 pb-28">
          <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-5 text-white shadow-lg md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium text-blue-100">
                  Contact Overview
                </p>
                <h1 className="mt-1 text-2xl font-bold md:text-3xl">
                  Create Contact
                </h1>
                <p className="mt-2 text-sm text-blue-100 md:text-base">
                  Add a new contact using the same section layout as the contact
                  detail page.
                </p>
              </div>

              <Button
                type="button"
                variant="primary"
                onClick={() => navigate("/contacts")}
                className="bg-white !text-blue-700 hover:!bg-blue-50"
              >
                Back to Contacts
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-slate-800">
              Basic Information
            </h2>
            <div className="grid items-start gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
              <div>
                <ContactPhotoPicker
                  imageUrl={photoPreviewUrl}
                  displayName={formData.displayName}
                  fileName={photoFile?.name || ""}
                  error={errors.photo}
                  onFileChange={handlePhotoChange}
                  onRemove={handleRemovePhoto}
                  actionsLayout="split"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    className="block text-sm font-semibold text-slate-700"
                    htmlFor="displayName"
                  >
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="displayName"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleChange}
                    placeholder="e.g. Jane Doe"
                    className={inputClassName(errors.displayName)}
                  />
                  {errors.displayName && (
                    <p className="text-sm text-red-600">{errors.displayName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    className="block text-sm font-semibold text-slate-700"
                    htmlFor="firstName"
                  >
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Optional"
                    className={inputClassName()}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="block text-sm font-semibold text-slate-700"
                    htmlFor="lastName"
                  >
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Optional"
                    className={inputClassName()}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="block text-sm font-semibold text-slate-700"
                    htmlFor="company"
                  >
                    Company
                  </label>
                  <input
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Optional"
                    className={inputClassName()}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="block text-sm font-semibold text-slate-700"
                    htmlFor="jobTitle"
                  >
                    Job Title
                  </label>
                  <input
                    id="jobTitle"
                    name="jobTitle"
                    value={formData.jobTitle}
                    onChange={handleChange}
                    placeholder="Optional"
                    className={inputClassName()}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="block text-sm font-semibold text-slate-700"
                    htmlFor="website"
                  >
                    Website
                  </label>
                  <input
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://example.com"
                    className={inputClassName()}
                  />
                </div>

                <div className="md:col-span-2">
                  <FavoriteToggle
                    checked={formData.favorite}
                    onChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        favorite: value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-xl font-semibold text-slate-800">Phone</h2>
              <div className="grid gap-4 md:grid-cols-12">
                <div className="md:col-span-8 space-y-2">
                  <label
                    className="block text-sm font-semibold text-slate-700"
                    htmlFor="phone"
                  >
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="e.g. +1-555-0100"
                    className={inputClassName(errors.phone)}
                    type="number"
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-600">{errors.phone}</p>
                  )}
                </div>
                <div className="md:col-span-4 space-y-2">
                  <label
                    className="block text-sm font-semibold text-slate-700"
                    htmlFor="phoneLabel"
                  >
                    Label
                  </label>
                  <input
                    id="phoneLabel"
                    name="phoneLabel"
                    value={formData.phoneLabel}
                    onChange={handleChange}
                    placeholder="mobile"
                    className={inputClassName()}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-xl font-semibold text-slate-800">Email</h2>
              <div className="grid gap-4 md:grid-cols-12">
                <div className="md:col-span-8 space-y-2">
                  <label
                    className="block text-sm font-semibold text-slate-700"
                    htmlFor="email"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. jane@example.com"
                    className={inputClassName(errors.email)}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email}</p>
                  )}
                </div>
                <div className="md:col-span-4 space-y-2">
                  <label
                    className="block text-sm font-semibold text-slate-700"
                    htmlFor="emailLabel"
                  >
                    Label
                  </label>
                  <input
                    id="emailLabel"
                    name="emailLabel"
                    value={formData.emailLabel}
                    onChange={handleChange}
                    placeholder="personal"
                    className={inputClassName()}
                  />
                </div>
              </div>
            </section>
          </div>

          <div
            className={`rounded-lg border px-4 py-3 text-sm font-medium ${
              errors.phone ||
              errors.email ||
              (isBlank(formData.phone) && isBlank(formData.email))
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {contactMethodHint}
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-xl font-semibold text-slate-800">
              Notes and Tags
            </h2>
            <div className="space-y-2">
              <label
                className="block text-sm font-semibold text-slate-700"
                htmlFor="tagsText"
              >
                Tags
              </label>
              <input
                id="tagsText"
                name="tagsText"
                value={formData.tagsText}
                onChange={handleChange}
                placeholder="Tags (comma separated)"
                className={inputClassName()}
              />
            </div>

            <div className="space-y-2">
              <label
                className="block text-sm font-semibold text-slate-700"
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
                rows={5}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none transition focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </section>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4">
          <div className="container mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-600/95 to-purple-600/95 px-4 py-3 shadow-lg backdrop-blur">
            <Button
              type="button"
              variant="outline"
              onClick={handleResetForm}
              disabled={loading}
              className="border-white/40 bg-white/10 !text-white hover:!border-white hover:!bg-white/20"
            >
              Reset
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="bg-white !text-blue-700 hover:!bg-blue-50"
            >
              Save Contact
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateContact;
