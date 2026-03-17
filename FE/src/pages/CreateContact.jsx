import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ContactPhotoPicker from "../components/contacts/ContactPhotoPicker";
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

const inputClassName = (error) =>
  `w-full rounded-lg border px-3 py-2 text-slate-800 outline-none transition focus:ring-2 focus:ring-blue-200 ${
    error ? "border-red-400" : "border-slate-300"
  }`;

const FavoriteToggle = ({ checked, onChange }) => (
  <label
    className={`group flex cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3 transition ${
      checked
        ? "border-purple-500 bg-purple-500 shadow-sm"
        : "border-slate-300 bg-white hover:border-purple-300 hover:bg-purple-50"
    }`}
  >
    <div className="space-y-1">
      <div
        className={`text-sm font-semibold ${
          checked ? "text-white" : "text-slate-800 group-hover:text-purple-700"
        }`}
      >
        Favorite
      </div>
      <div
        className={`text-xs ${
          checked
            ? "text-purple-100"
            : "text-slate-500 group-hover:text-purple-600"
        }`}
      >
        Highlight this contact for faster access.
      </div>
    </div>
    <div className="relative shrink-0">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 transition ${
          checked
            ? "border-purple-200 bg-purple-200 text-purple-600"
            : "border-slate-300 bg-slate-100 text-transparent group-hover:border-purple-300 group-hover:bg-purple-50 group-hover:text-purple-600"
        } peer-focus-visible:ring-2 peer-focus-visible:ring-purple-300 peer-focus-visible:ring-offset-2`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>
  </label>
);

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
    <div className="min-h-screen bg-slate-50">
      <form onSubmit={handleSubmit}>
        <div className="container mx-auto max-w-7xl space-y-6 px-4 py-8 pb-28">
          <section className="flex justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                Create Contact
              </h1>
              <p className="mt-2 text-slate-600">
                Add a new contact using the same section layout as the contact
                detail page.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/contacts")}
              className="text-lg font-semibold text-blue-600 transition hover:text-blue-700"
            >
              Back to Contacts
            </button>
          </section>

          {errors.general && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-bold text-red-700">
              {errors.general}
            </div>
          )}

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
                    className={inputClassName(errors.website)}
                  />
                  {errors.website && (
                    <p className="text-sm text-red-600">{errors.website}</p>
                  )}
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
            <h2 className="text-xl font-semibold text-slate-800">Notes</h2>
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
              className="!border-blue-200 bg-purple-500 !text-white hover:!bg-gradient-to-r hover:!border-blue-100 hover:!to-blue-600 hover:!from-purple-600 hover:!text-white"
            >
              Reset
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="!border-blue-200 border-2 bg-blue-500 !text-white hover:!bg-gradient-to-r hover:!to-blue-600 hover:!from-purple-600"
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
