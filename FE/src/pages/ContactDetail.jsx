import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ContactPhotoPicker from "../components/contacts/ContactPhotoPicker";
import Button from "../components/common/Button";
import api from "../utils/api";
import {
  buildContactUploadFormData,
  validateContactPhotoFile,
} from "../utils/contactMedia";

const createPhone = () => ({ label: "mobile", value: "", isPrimary: false });
const createEmail = () => ({ label: "personal", value: "", isPrimary: false });
const createAddress = () => ({
  label: "home",
  street: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
});
const createSocial = () => ({ platform: "", url: "" });

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
          checked ? "text-purple-100" : "text-slate-500 group-hover:text-purple-600"
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
        onChange={(e) => onChange(e.target.checked)}
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

const ScrollableRecordList = ({
  children,
  maxHeightClass = "max-h-[12rem]",
}) => (
  <div
    className={`${maxHeightClass} space-y-3 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent`}
  >
    {children}
  </div>
);

const toDateInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const normalizePhones = (contact) => {
  const raw = Array.isArray(contact?.phones)
    ? contact.phones
    : Array.isArray(contact?.phoneNumbers)
      ? contact.phoneNumbers
      : [];

  const mapped = raw
    .map((item) => ({
      label: item?.label || "mobile",
      value: item?.value || item?.number || "",
      isPrimary: !!item?.isPrimary,
    }))
    .filter((item) => item.value);

  return mapped.length ? mapped : [createPhone()];
};

const normalizeEmails = (contact) => {
  const mapped = (Array.isArray(contact?.emails) ? contact.emails : [])
    .map((item) => ({
      label: item?.label || "personal",
      value: item?.value || item?.email || "",
      isPrimary: !!item?.isPrimary,
    }))
    .filter((item) => item.value);

  return mapped.length ? mapped : [createEmail()];
};

const normalizeAddresses = (contact) => {
  const mapped = (Array.isArray(contact?.addresses) ? contact.addresses : [])
    .map((item) => ({
      label: item?.label || "home",
      street: item?.street || "",
      city: item?.city || "",
      state: item?.state || "",
      postalCode: item?.postalCode || "",
      country: item?.country || "",
    }))
    .filter((item) =>
      [item.street, item.city, item.state, item.postalCode, item.country].some(
        Boolean,
      ),
    );

  return mapped.length ? mapped : [createAddress()];
};

const normalizeSocialLinks = (contact) => {
  const mapped = (
    Array.isArray(contact?.socialLinks) ? contact.socialLinks : []
  )
    .map((item) => ({
      platform: item?.platform || "",
      url: item?.url || "",
    }))
    .filter((item) => item.platform || item.url);

  return mapped.length ? mapped : [createSocial()];
};

const toFormData = (contact) => ({
  displayName: contact?.displayName || contact?.name || "",
  company: contact?.company || "",
  jobTitle: contact?.jobTitle || "",
  department: contact?.department || "",
  nickname: contact?.nickname || "",
  photoUrl: contact?.photoUrl || "",
  removePhoto: false,
  website: contact?.website || "",
  birthday: toDateInputValue(contact?.birthday),
  source: contact?.source || "manual",
  favorite: !!contact?.favorite,
  notes: contact?.notes || "",
  tagsText: Array.isArray(contact?.tags) ? contact.tags.join(", ") : "",
  phones: normalizePhones(contact),
  emails: normalizeEmails(contact),
  addresses: normalizeAddresses(contact),
  socialLinks: normalizeSocialLinks(contact),
});

const ContactDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contact, setContact] = useState(null);
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
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

  const setPreviewFromFile = (file) => {
    setPhotoPreviewUrl((prev) => {
      if (prev.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return file ? URL.createObjectURL(file) : "";
    });
  };

  const resetSelectedPhoto = () => {
    setPhotoFile(null);
    setPreviewFromFile(null);
  };

  const fetchContact = async () => {
    try {
      setLoading(true);
      setNotFound(false);
      setFetchError("");

      const response = await api.get(`/contacts/${id}`);
      const data = response?.data?.data || null;

      if (!data) {
        setNotFound(true);
        return;
      }

      setContact(data);
      setFormData(toFormData(data));
      resetSelectedPhoto();
    } catch (requestError) {
      if (requestError?.response?.status === 404) {
        setNotFound(true);
        return;
      }
      setFetchError(
        requestError?.response?.data?.message ||
          "Failed to load contact details.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContact();
  }, [id]);

  const navigateToContacts = () => {
    navigate("/contacts", {
      state: { refreshContacts: true },
    });
  };

  const updateField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0] || null;
    const photoError = validateContactPhotoFile(file);

    if (photoError) {
      setSaveMessage("");
      setSaveError(photoError);
      event.target.value = "";
      return;
    }

    setPhotoFile(file);
    setPreviewFromFile(file);
    setFormData((prev) => ({
      ...prev,
      removePhoto: false,
    }));
    setSaveMessage("");
    setSaveError("");
    event.target.value = "";
  };

  const handleRemovePhoto = () => {
    resetSelectedPhoto();
    setFormData((prev) => ({
      ...prev,
      photoUrl: "",
      removePhoto: true,
    }));
    setSaveMessage("");
    setSaveError("");
  };

  const updateListField = (listName, index, key, value) => {
    setFormData((prev) => ({
      ...prev,
      [listName]: prev[listName].map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const addListItem = (listName, factory) => {
    setFormData((prev) => ({
      ...prev,
      [listName]: [...prev[listName], factory()],
    }));
  };

  const removeListItem = (listName, index) => {
    setFormData((prev) => ({
      ...prev,
      [listName]: prev[listName].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const payload = useMemo(() => {
    if (!formData) return null;

    return {
      displayName: formData.displayName.trim(),
      company: formData.company.trim(),
      jobTitle: formData.jobTitle.trim(),
      department: formData.department.trim(),
      nickname: formData.nickname.trim(),
      website: formData.website.trim(),
      birthday: formData.birthday || null,
      source: formData.source.trim() || "manual",
      favorite: !!formData.favorite,
      removePhoto: !!formData.removePhoto,
      notes: formData.notes,
      tags: formData.tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      phones: formData.phones
        .map((item) => ({
          label: item.label?.trim() || "mobile",
          value: item.value?.trim() || "",
          isPrimary: !!item.isPrimary,
        }))
        .filter((item) => item.value),
      emails: formData.emails
        .map((item) => ({
          label: item.label?.trim() || "personal",
          value: item.value?.trim() || "",
          isPrimary: !!item.isPrimary,
        }))
        .filter((item) => item.value),
      addresses: formData.addresses
        .map((item) => ({
          label: item.label?.trim() || "home",
          street: item.street?.trim() || "",
          city: item.city?.trim() || "",
          state: item.state?.trim() || "",
          postalCode: item.postalCode?.trim() || "",
          country: item.country?.trim() || "",
        }))
        .filter((item) =>
          [
            item.street,
            item.city,
            item.state,
            item.postalCode,
            item.country,
          ].some(Boolean),
        ),
      socialLinks: formData.socialLinks
        .map((item) => ({
          platform: item.platform?.trim() || "",
          url: item.url?.trim() || "",
        }))
        .filter((item) => item.platform && item.url),
    };
  }, [formData]);

  const handleUpdate = async () => {
    if (!payload?.displayName) {
      setSaveError("Display name is required.");
      return;
    }

    setSaveLoading(true);
    setSaveError("");
    setSaveMessage("");

    try {
      const requestData = buildContactUploadFormData(payload, photoFile);
      const response = await api.put(`/contacts/${id}`, requestData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      const updatedContact = response?.data?.data;

      if (updatedContact) {
        setContact(updatedContact);
        setFormData(toFormData(updatedContact));
        resetSelectedPhoto();
      }

      setSaveMessage("Contact updated successfully.");
    } catch (requestError) {
      setSaveError(
        requestError?.response?.data?.message || "Failed to update contact.",
      );
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
          <p className="mt-4 text-slate-600">Loading contact details...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4">
        <div className="max-w-2xl mx-auto rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <h1 className="text-3xl font-bold text-slate-800 mb-3">
            Contact Not Found
          </h1>
          <p className="text-slate-600 mb-6">
            This contact does not exist or has been removed.
          </p>
          <Button variant="primary" onClick={navigateToContacts}>
            Back to Contacts
          </Button>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4">
        <div className="max-w-2xl mx-auto rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-800 mb-3">
            Unable to Load Contact
          </h1>
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 mb-6">
            {fetchError}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={fetchContact}>
              Try Again
            </Button>
            <Button variant="outline" onClick={navigateToContacts}>
              Back to Contacts
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!contact || !formData) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
        <div className="sticky top-20 z-20 flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-600/95 to-purple-600/95 px-4 py-3 shadow-lg backdrop-blur">
          <Button
            variant="outline"
            onClick={navigateToContacts}
            className="!border-blue-200 bg-purple-500 !text-white hover:!bg-gradient-to-r hover:!border-blue-100 hover:!to-blue-600 hover:!from-purple-600 hover:!text-white"
          >
            Back to Contacts
          </Button>
          <Button
            variant="primary"
            onClick={handleUpdate}
            loading={saveLoading}
            className="!border-blue-200 border-2 bg-blue-500 !text-white hover:!bg-gradient-to-r hover:!to-blue-600 hover:!from-purple-600"
          >
            Update Information
          </Button>
        </div>

        {saveMessage && (
          <div className="rounded-lg border-2 border-green-700 bg-green-50 px-4 py-3 font-bold text-green-700">
            {saveMessage}
          </div>
        )}
        {saveError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-bold text-red-700">
            {saveError}
          </div>
        )}

        <section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            Basic Information
          </h2>
          <div className="grid grid-cols-2 gap-4 items-start mb-6">
            <div className="md:col-span-1">
              <ContactPhotoPicker
                imageUrl={photoPreviewUrl || formData.photoUrl}
                displayName={formData.displayName}
                fileName={photoFile?.name || ""}
                error={null}
                onFileChange={handlePhotoChange}
                onRemove={handleRemovePhoto}
              />
            </div>
            <div className="md:col-span-1">
              <FavoriteToggle
                checked={formData.favorite}
                onChange={(value) => updateField("favorite", value)}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Display Name"
              value={formData.displayName}
              onChange={(e) => updateField("displayName", e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Nickname"
              value={formData.nickname}
              onChange={(e) => updateField("nickname", e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Company"
              value={formData.company}
              onChange={(e) => updateField("company", e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Job Title"
              value={formData.jobTitle}
              onChange={(e) => updateField("jobTitle", e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Department"
              value={formData.department}
              onChange={(e) => updateField("department", e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Website"
              value={formData.website}
              onChange={(e) => updateField("website", e.target.value)}
            />

            <input
              type="date"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={formData.birthday}
              onChange={(e) => updateField("birthday", e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Source"
              value={formData.source}
              onChange={(e) => updateField("source", e.target.value)}
            />
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-4">
          <section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800">
                Phone Numbers
              </h2>
              <Button
                variant="outline"
                onClick={() => addListItem("phones", createPhone)}
              >
                + Add
              </Button>
            </div>
            <ScrollableRecordList>
              {formData.phones.map((item, index) => (
                <div
                  key={`phone-${index}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="grid md:grid-cols-12 gap-2 items-center">
                    <input
                      className="md:col-span-3 rounded-lg border border-slate-300 px-3 py-2"
                      placeholder="Label"
                      value={item.label}
                      onChange={(e) =>
                        updateListField("phones", index, "label", e.target.value)
                      }
                    />
                    <input
                      className="md:col-span-5 rounded-lg border border-slate-300 px-3 py-2"
                      placeholder="Phone"
                      value={item.value}
                      onChange={(e) =>
                        updateListField("phones", index, "value", e.target.value)
                      }
                    />
                    <label className="md:col-span-2 text-sm text-slate-700 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.isPrimary}
                        aria-label="Set as primary phone"
                        title="Set as primary phone"
                        onChange={(e) =>
                          updateListField(
                            "phones",
                            index,
                            "isPrimary",
                            e.target.checked,
                          )
                        }
                      />
                    </label>
                    <Button
                      variant="danger"
                      onClick={() => removeListItem("phones", index)}
                      className="md:col-span-2 justify-self-end"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </ScrollableRecordList>
          </section>

          <section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800">Emails</h2>
              <Button
                variant="outline"
                onClick={() => addListItem("emails", createEmail)}
              >
                + Add
              </Button>
            </div>
            <ScrollableRecordList>
              {formData.emails.map((item, index) => (
                <div
                  key={`email-${index}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="grid md:grid-cols-12 gap-2 items-center">
                    <input
                      className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-2"
                      placeholder="Label"
                      value={item.label}
                      onChange={(e) =>
                        updateListField("emails", index, "label", e.target.value)
                      }
                    />
                    <input
                      className="md:col-span-6 rounded-lg border border-slate-300 px-3 py-2"
                      placeholder="Email"
                      value={item.value}
                      onChange={(e) =>
                        updateListField("emails", index, "value", e.target.value)
                      }
                    />
                    <label className="md:col-span-2 text-sm text-slate-700 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.isPrimary}
                        aria-label="Set as primary email"
                        title="Set as primary email"
                        onChange={(e) =>
                          updateListField(
                            "emails",
                            index,
                            "isPrimary",
                            e.target.checked,
                          )
                        }
                      />
                    </label>
                    <Button
                      variant="danger"
                      onClick={() => removeListItem("emails", index)}
                      className="md:col-span-2 justify-self-end"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </ScrollableRecordList>
          </section>
        </div>
        <section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800">Addresses</h2>
            <Button
              variant="outline"
              onClick={() => addListItem("addresses", createAddress)}
            >
              + Add
            </Button>
          </div>
          <ScrollableRecordList maxHeightClass="max-h-[27rem]">
            {formData.addresses.map((item, index) => (
              <div
                key={`address-${index}`}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex gap-2">
                  <div className="md:col-span-3 font-semibold text-slate-700">
                    Address {index + 1}
                  </div>
                  <Button
                    variant="danger"
                    onClick={() => removeListItem("addresses", index)}
                  >
                    Remove
                  </Button>
                </div>
                <div className="grid md:grid-cols-3 gap-2 py-2">
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="Label"
                    value={item.label}
                    onChange={(e) =>
                      updateListField("addresses", index, "label", e.target.value)
                    }
                  />
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="Street"
                    value={item.street}
                    onChange={(e) =>
                      updateListField(
                        "addresses",
                        index,
                        "street",
                        e.target.value,
                      )
                    }
                  />
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="City"
                    value={item.city}
                    onChange={(e) =>
                      updateListField("addresses", index, "city", e.target.value)
                    }
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-2">
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="State"
                    value={item.state}
                    onChange={(e) =>
                      updateListField("addresses", index, "state", e.target.value)
                    }
                  />
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="Postal Code"
                    value={item.postalCode}
                    onChange={(e) =>
                      updateListField(
                        "addresses",
                        index,
                        "postalCode",
                        e.target.value,
                      )
                    }
                  />
                  <input
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="Country"
                    value={item.country}
                    onChange={(e) =>
                      updateListField(
                        "addresses",
                        index,
                        "country",
                        e.target.value,
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </ScrollableRecordList>
        </section>

        <section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800">
              Social Links
            </h2>
            <Button
              variant="outline"
              onClick={() => addListItem("socialLinks", createSocial)}
            >
              + Add
            </Button>
          </div>
          <ScrollableRecordList>
            {formData.socialLinks.map((item, index) => (
              <div
                key={`social-${index}`}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="grid md:grid-cols-12 gap-2 items-center">
                  <input
                    className="md:col-span-4 rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="Platform"
                    value={item.platform}
                    onChange={(e) =>
                      updateListField(
                        "socialLinks",
                        index,
                        "platform",
                        e.target.value,
                      )
                    }
                  />
                  <input
                    className="md:col-span-7 rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="URL"
                    value={item.url}
                    onChange={(e) =>
                      updateListField("socialLinks", index, "url", e.target.value)
                    }
                  />
                  <Button
                    variant="danger"
                    onClick={() => removeListItem("socialLinks", index)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </ScrollableRecordList>
        </section>

        <section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-slate-800">
            Notes and Tags
          </h2>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Tags (comma separated)"
            value={formData.tagsText}
            onChange={(e) => updateField("tagsText", e.target.value)}
          />
          <textarea
            rows={5}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Notes"
            value={formData.notes}
            onChange={(e) => updateField("notes", e.target.value)}
          />
        </section>
      </div>
    </div>
  );
};

export default ContactDetail;
