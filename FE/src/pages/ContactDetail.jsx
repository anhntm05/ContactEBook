import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/common/Button";
import api from "../utils/api";

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

  const updateField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
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
      photoUrl: formData.photoUrl.trim(),
      website: formData.website.trim(),
      birthday: formData.birthday || null,
      source: formData.source.trim() || "manual",
      favorite: !!formData.favorite,
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
      const response = await api.put(`/contacts/${id}`, payload);
      const updatedContact = response?.data?.data;

      if (updatedContact) {
        setContact(updatedContact);
        setFormData(toFormData(updatedContact));
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
          <Button variant="primary" onClick={() => navigate("/contacts")}>
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
            <Button variant="outline" onClick={() => navigate("/contacts")}>
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
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-slate-50/95 backdrop-blur py-2">
          <Button variant="outline" onClick={() => navigate("/contacts")}>
            Back to Contacts
          </Button>
          <Button
            variant="primary"
            onClick={handleUpdate}
            loading={saveLoading}
          >
            Update Information
          </Button>
        </div>

        {saveMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            {saveMessage}
          </div>
        )}
        {saveError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {saveError}
          </div>
        )}

        <section className="rounded-2xl bg-white shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            Basic Information
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Photo URL"
              value={formData.photoUrl}
              onChange={(e) => updateField("photoUrl", e.target.value)}
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
            <label className="flex items-center gap-2 text-slate-700">
              <input
                type="checkbox"
                checked={formData.favorite}
                onChange={(e) => updateField("favorite", e.target.checked)}
              />{" "}
              Favorite
            </label>
          </div>
        </section>

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
          {formData.phones.map((item, index) => (
            <div
              key={`phone-${index}`}
              className="grid md:grid-cols-12 gap-2 items-center"
            >
              <input
                className="md:col-span-3 rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Label"
                value={item.label}
                onChange={(e) =>
                  updateListField("phones", index, "label", e.target.value)
                }
              />
              <input
                className="md:col-span-6 rounded-lg border border-slate-300 px-3 py-2"
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
                  onChange={(e) =>
                    updateListField(
                      "phones",
                      index,
                      "isPrimary",
                      e.target.checked,
                    )
                  }
                />{" "}
                Primary
              </label>
              <Button
                variant="danger"
                onClick={() => removeListItem("phones", index)}
              >
                Remove
              </Button>
            </div>
          ))}
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
          {formData.emails.map((item, index) => (
            <div
              key={`email-${index}`}
              className="grid md:grid-cols-12 gap-2 items-center"
            >
              <input
                className="md:col-span-3 rounded-lg border border-slate-300 px-3 py-2"
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
                  onChange={(e) =>
                    updateListField(
                      "emails",
                      index,
                      "isPrimary",
                      e.target.checked,
                    )
                  }
                />{" "}
                Primary
              </label>
              <Button
                variant="danger"
                onClick={() => removeListItem("emails", index)}
              >
                Remove
              </Button>
            </div>
          ))}
        </section>

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
          {formData.addresses.map((item, index) => (
            <div key={`address-${index}`}>
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
              <div className="grid md:grid-cols-3 gap-2 py-2  ">
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
          {formData.socialLinks.map((item, index) => (
            <div
              key={`social-${index}`}
              className="grid md:grid-cols-12 gap-2 items-center"
            >
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
          ))}
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
