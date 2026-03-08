import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import api from "../utils/api";
import { getInitials, formatDate } from "../utils/helpers";
import { getContactMeta, removeContactMeta, upsertContactMeta } from "../utils/contactMeta";

const phoneLabels = ["Mobile", "Work", "Home", "Other"];
const emailLabels = ["Personal", "Work", "Other"];
const customTypes = ["Text", "Date", "URL", "Number"];

const createPhone = () => ({ number: "", label: "Mobile" });
const createEmail = () => ({ email: "", label: "Personal" });
const createCustom = () => ({ name: "", value: "", type: "Text" });

const buildForm = (contact, meta) => {
  const name = (contact?.name || "").trim();
  const split = name ? name.split(" ") : [];
  const fallbackFirst = split.slice(0, -1).join(" ") || split[0] || "";
  const fallbackLast = split.length > 1 ? split[split.length - 1] : "";

  return {
    firstName: meta?.firstName ?? contact?.firstName ?? fallbackFirst,
    lastName: meta?.lastName ?? contact?.lastName ?? fallbackLast,
    company: meta?.company ?? contact?.company ?? "",
    jobTitle: meta?.jobTitle ?? contact?.jobTitle ?? "",
    phoneNumbers:
      meta?.phoneNumbers || contact?.phoneNumbers || contact?.phones || (contact?.phone ? [{ number: contact.phone, label: "Primary" }] : [createPhone()]),
    emails: meta?.emails || contact?.emails || (contact?.email ? [{ email: contact.email, label: "Primary" }] : [createEmail()]),
    address: {
      street: meta?.addressDetails?.street || "",
      city: meta?.addressDetails?.city || "",
      state: meta?.addressDetails?.state || "",
      zip: meta?.addressDetails?.zip || "",
      country: meta?.addressDetails?.country || "",
    },
    notes: meta?.notes ?? contact?.notes ?? "",
    tags: Array.isArray(meta?.tags) ? meta.tags : Array.isArray(contact?.tags) ? contact.tags : [],
    tagInput: "",
    favorite: typeof meta?.favorite === "boolean" ? meta.favorite : !!contact?.favorite,
    customFields: Array.isArray(meta?.customFields) ? meta.customFields : Array.isArray(contact?.customFields) ? contact.customFields : [],
    profilePreview: meta?.profilePreview || contact?.profilePicture || "",
  };
};

const ContactDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const formRef = useRef(null);

  const [contact, setContact] = useState(null);
  const [formData, setFormData] = useState(null);
  const [originalForm, setOriginalForm] = useState(null);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [generalMessage, setGeneralMessage] = useState(location.state?.successMessage || "");

  const [isEditing, setIsEditing] = useState(!!location.state?.startEdit);
  const [errors, setErrors] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const isDirty = useMemo(() => {
    if (!formData || !originalForm) return false;
    return JSON.stringify(formData) !== JSON.stringify(originalForm);
  }, [formData, originalForm]);

  const fetchContact = async () => {
    try {
      setLoading(true);
      setNotFound(false);
      setFetchError("");
      const response = await api.get(`/contacts/${id}`);
      const data = response.data?.data || response.data;
      if (!data) {
        setNotFound(true);
        return;
      }
      const meta = getContactMeta(id);
      const built = buildForm(data, meta);
      setContact(data);
      setFormData(built);
      setOriginalForm(built);
    } catch (error) {
      if (error.response?.status === 404) setNotFound(true);
      else setFetchError(error.response?.data?.message || "Failed to load contact details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContact(); }, [id]);

  useEffect(() => {
    const onKey = (event) => {
      if (!isEditing) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        if (isDirty && !window.confirm("Discard your unsaved changes?")) return;
        setFormData(originalForm);
        setErrors({});
        setIsEditing(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isEditing, isDirty, originalForm]);

  const updateList = (listName, index, key, value) => {
    setFormData((prev) => ({
      ...prev,
      [listName]: prev[listName].map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    }));
  };

  const validate = () => {
    const nextErrors = { phoneNumbers: [], emails: [] };
    const phoneRegex = /^[+]?[0-9\s()-]{7,20}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.firstName.trim()) nextErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) nextErrors.lastName = "Last name is required";
    if (!formData.phoneNumbers[0]?.number?.trim()) nextErrors.phoneNumbers[0] = "At least one phone number is required";

    formData.phoneNumbers.forEach((item, index) => {
      if (item.number?.trim() && !phoneRegex.test(item.number.trim())) nextErrors.phoneNumbers[index] = "Invalid phone format";
    });

    formData.emails.forEach((item, index) => {
      if (item.email?.trim() && !emailRegex.test(item.email.trim())) nextErrors.emails[index] = "Invalid email format";
    });

    const hasErrors = Object.keys(nextErrors).some((key) => {
      const value = nextErrors[key];
      return Array.isArray(value) ? value.some(Boolean) : !!value;
    });

    return hasErrors ? nextErrors : {};
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSaveLoading(true);
    const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
    const phoneNumbers = formData.phoneNumbers.map((item) => ({ number: item.number?.trim() || "", label: item.label || "Mobile" })).filter((item) => item.number);
    const emails = formData.emails.map((item) => ({ email: item.email?.trim() || "", label: item.label || "Personal" })).filter((item) => item.email);
    const addressDetails = {
      street: formData.address.street?.trim() || "",
      city: formData.address.city?.trim() || "",
      state: formData.address.state?.trim() || "",
      zip: formData.address.zip?.trim() || "",
      country: formData.address.country?.trim() || "",
    };

    const payload = {
      name: fullName,
      phone: phoneNumbers[0]?.number || "",
      email: emails[0]?.email || "",
      address: Object.values(addressDetails).filter(Boolean).join(", "),
      company: formData.company.trim(),
      jobTitle: formData.jobTitle.trim(),
      phones: phoneNumbers,
      emails,
      addressDetails,
      notes: formData.notes.trim(),
      tags: formData.tags,
      favorite: formData.favorite,
      customFields: formData.customFields,
    };

    try {
      const response = await api.put(`/contacts/${id}`, payload);
      const updated = response.data?.data || { ...contact, ...payload };
      setContact(updated);
      upsertContactMeta(id, {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        company: formData.company.trim(),
        jobTitle: formData.jobTitle.trim(),
        phoneNumbers,
        emails,
        addressDetails,
        notes: formData.notes.trim(),
        tags: formData.tags,
        favorite: formData.favorite,
        customFields: formData.customFields,
        profilePreview: formData.profilePreview,
      });
      setOriginalForm(formData);
      setIsEditing(false);
      setGeneralMessage("Contact updated successfully.");
      setErrors({});
    } catch (error) {
      setErrors((prev) => ({ ...prev, general: error.response?.data?.message || "Failed to update contact." }));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await api.delete(`/contacts/${id}`);
      removeContactMeta(id);
      navigate("/dashboard", { state: { successMessage: "Contact deleted successfully." } });
    } catch (error) {
      setDeleteError(error.response?.data?.message || "Failed to delete contact.");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading contact details...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4"><div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-center"><h1 className="text-3xl font-bold text-gray-800 mb-3">Contact Not Found</h1><p className="text-gray-600 mb-6">The contact does not exist or has been removed.</p><Button variant="primary" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button></div></div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4"><div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8"><h1 className="text-3xl font-bold text-gray-800 mb-3">Unable to Load Contact</h1><div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">{fetchError}</div><div className="flex items-center gap-3"><Button variant="primary" onClick={fetchContact}>Try Again</Button><Button variant="outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button></div></div></div>
    );
  }

  if (!contact || !formData) return null;

  const displayName = `${formData.firstName || ""} ${formData.lastName || ""}`.trim() || contact.name || "Unnamed Contact";
  const createdText = contact.createdAt ? formatDate(contact.createdAt) : "Unknown";
  const updatedText = contact.updatedAt ? formatDate(contact.updatedAt) : "Unknown";

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => { if (isDirty && !window.confirm("Discard your unsaved changes?")) return; setFormData(originalForm); setErrors({}); setIsEditing(false); }} disabled={saveLoading}>Cancel</Button>
                <Button type="button" variant="primary" onClick={() => formRef.current?.requestSubmit()} loading={saveLoading}>Save Changes</Button>
                <Button type="button" variant="danger" onClick={() => setShowDeleteModal(true)} disabled={saveLoading}>Delete Contact</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setIsEditing(true)}>Edit</Button>
                <Button variant="danger" onClick={() => setShowDeleteModal(true)}>Delete</Button>
              </div>
            )}
          </div>

          {generalMessage && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">{generalMessage}</div>}
          {errors.general && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{errors.general}</div>}

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-bold overflow-hidden">
                {formData.profilePreview ? <img src={formData.profilePreview} alt={displayName} className="w-full h-full object-cover" /> : getInitials(displayName)}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">{displayName}</h1>
                <p className="text-gray-600">{formData.company || "No company"} {formData.jobTitle ? `- ${formData.jobTitle}` : ""}</p>
              </div>
            </div>
          </div>

          {isEditing ? (
            <form ref={formRef} onSubmit={handleSave} className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Basic Information</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input label="First Name" name="firstName" value={formData.firstName} onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))} required error={errors.firstName} />
                  <Input label="Last Name" name="lastName" value={formData.lastName} onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))} required error={errors.lastName} />
                  <Input label="Company" name="company" value={formData.company} onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))} />
                  <Input label="Job Title" name="jobTitle" value={formData.jobTitle} onChange={(e) => setFormData((prev) => ({ ...prev, jobTitle: e.target.value }))} />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 space-y-5">
                <h2 className="text-xl font-semibold text-gray-800">Contact Information</h2>
                <div>
                  <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-gray-700">Phone Numbers</h3><Button type="button" variant="outline" onClick={() => setFormData((prev) => ({ ...prev, phoneNumbers: [...prev.phoneNumbers, createPhone()] }))}>+ Add Phone</Button></div>
                  <div className="space-y-2">
                    {formData.phoneNumbers.map((item, index) => (
                      <div key={`p-${index}`} className="grid md:grid-cols-12 gap-2 items-end">
                        <div className="md:col-span-7"><Input label={`Phone ${index + 1}`} name={`phone-${index}`} value={item.number || ""} onChange={(e) => updateList("phoneNumbers", index, "number", e.target.value)} error={errors.phoneNumbers?.[index]} /></div>
                        <div className="md:col-span-3 mb-4"><label className="block text-gray-700 text-sm font-semibold mb-2">Label</label><select value={item.label || "Mobile"} onChange={(e) => updateList("phoneNumbers", index, "label", e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">{phoneLabels.map((l) => <option key={l} value={l}>{l}</option>)}</select></div>
                        <div className="md:col-span-2 mb-4"><Button type="button" variant="danger" fullWidth disabled={formData.phoneNumbers.length === 1} onClick={() => setFormData((prev) => ({ ...prev, phoneNumbers: prev.phoneNumbers.filter((_, i) => i !== index) }))}>Remove</Button></div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-gray-700">Email Addresses</h3><Button type="button" variant="outline" onClick={() => setFormData((prev) => ({ ...prev, emails: [...prev.emails, createEmail()] }))}>+ Add Email</Button></div>
                  <div className="space-y-2">
                    {formData.emails.map((item, index) => (
                      <div key={`e-${index}`} className="grid md:grid-cols-12 gap-2 items-end">
                        <div className="md:col-span-7"><Input label={`Email ${index + 1}`} type="email" name={`email-${index}`} value={item.email || ""} onChange={(e) => updateList("emails", index, "email", e.target.value)} error={errors.emails?.[index]} /></div>
                        <div className="md:col-span-3 mb-4"><label className="block text-gray-700 text-sm font-semibold mb-2">Label</label><select value={item.label || "Personal"} onChange={(e) => updateList("emails", index, "label", e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">{emailLabels.map((l) => <option key={l} value={l}>{l}</option>)}</select></div>
                        <div className="md:col-span-2 mb-4"><Button type="button" variant="danger" fullWidth disabled={formData.emails.length === 1} onClick={() => setFormData((prev) => ({ ...prev, emails: prev.emails.filter((_, i) => i !== index) }))}>Remove</Button></div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Input label="Street" name="street" value={formData.address.street} onChange={(e) => setFormData((prev) => ({ ...prev, address: { ...prev.address, street: e.target.value } }))} />
                  <Input label="City" name="city" value={formData.address.city} onChange={(e) => setFormData((prev) => ({ ...prev, address: { ...prev.address, city: e.target.value } }))} />
                  <Input label="State" name="state" value={formData.address.state} onChange={(e) => setFormData((prev) => ({ ...prev, address: { ...prev.address, state: e.target.value } }))} />
                  <Input label="ZIP" name="zip" value={formData.address.zip} onChange={(e) => setFormData((prev) => ({ ...prev, address: { ...prev.address, zip: e.target.value } }))} />
                  <Input label="Country" name="country" value={formData.address.country} onChange={(e) => setFormData((prev) => ({ ...prev, address: { ...prev.address, country: e.target.value } }))} />
                </div>

                <label className="inline-flex items-center gap-3"><input type="checkbox" checked={formData.favorite} onChange={(e) => setFormData((prev) => ({ ...prev, favorite: e.target.checked }))} className="h-4 w-4" /><span>Favorite Contact</span></label>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
                <label className="block text-gray-700 text-sm font-semibold">Notes</label>
                <textarea rows="4" value={formData.notes} onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-2">{formData.tags.map((tag) => <span key={tag} className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">{tag}</span>)}</div>
                  <div className="flex gap-2"><input type="text" value={formData.tagInput} onChange={(e) => setFormData((prev) => ({ ...prev, tagInput: e.target.value }))} placeholder="Add tag" className="w-full px-4 py-2 border border-gray-300 rounded-lg" /><Button type="button" variant="outline" onClick={() => { const t = formData.tagInput.trim(); if (!t) return; setFormData((prev) => ({ ...prev, tags: prev.tags.includes(t) ? prev.tags : [...prev.tags, t], tagInput: "" })); }}>Add</Button></div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2"><label className="block text-gray-700 text-sm font-semibold">Custom Fields</label><Button type="button" variant="outline" onClick={() => setFormData((prev) => ({ ...prev, customFields: [...prev.customFields, createCustom()] }))}>+ Add Custom Field</Button></div>
                  <div className="space-y-2">
                    {formData.customFields.map((field, index) => (
                      <div key={`c-${index}`} className="grid md:grid-cols-12 gap-2 items-end">
                        <div className="md:col-span-3"><Input label="Name" name={`cf-name-${index}`} value={field.name || ""} onChange={(e) => updateList("customFields", index, "name", e.target.value)} /></div>
                        <div className="md:col-span-4"><Input label="Value" name={`cf-value-${index}`} value={field.value || ""} onChange={(e) => updateList("customFields", index, "value", e.target.value)} /></div>
                        <div className="md:col-span-3 mb-4"><label className="block text-gray-700 text-sm font-semibold mb-2">Type</label><select value={field.type || "Text"} onChange={(e) => updateList("customFields", index, "type", e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg">{customTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
                        <div className="md:col-span-2 mb-4"><Button type="button" variant="danger" fullWidth onClick={() => setFormData((prev) => ({ ...prev, customFields: prev.customFields.filter((_, i) => i !== index) }))}>Remove</Button></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-lg shadow-md p-6"><h2 className="text-xl font-semibold text-gray-800 mb-3">Primary Contact Information</h2><div className="space-y-2">{formData.phoneNumbers.map((item, index) => <p key={`vp-${index}`} className="text-gray-700"><span className="font-semibold">{item.label || "Phone"}:</span> <a href={`tel:${item.number}`} className="text-blue-600 hover:underline">{item.number}</a></p>)}</div><div className="mt-4 space-y-2">{formData.emails.map((item, index) => <p key={`ve-${index}`} className="text-gray-700"><span className="font-semibold">{item.label || "Email"}:</span> <a href={`mailto:${item.email}`} className="text-blue-600 hover:underline">{item.email}</a></p>)}</div><div className="mt-4 text-gray-700"><span className="font-semibold">Address:</span> {[formData.address.street, formData.address.city, formData.address.state, formData.address.zip, formData.address.country].filter(Boolean).join(", ") || "Not provided"}</div></div>
                <div className="bg-white rounded-lg shadow-md p-6"><h2 className="text-xl font-semibold text-gray-800 mb-3">Professional Details</h2><p className="text-gray-700"><span className="font-semibold">Company:</span> {formData.company || "Not provided"}</p><p className="text-gray-700 mt-2"><span className="font-semibold">Job Title:</span> {formData.jobTitle || "Not provided"}</p></div>
                <div className="bg-white rounded-lg shadow-md p-6"><h2 className="text-xl font-semibold text-gray-800 mb-3">Additional Information</h2><p className="text-gray-700 whitespace-pre-wrap">{formData.notes || "No notes"}</p><div className="mt-4 flex flex-wrap gap-2">{(formData.tags || []).length ? formData.tags.map((tag) => <span key={tag} className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">{tag}</span>) : <span className="text-gray-500 text-sm">No tags</span>}</div><div className="mt-4 space-y-2">{(formData.customFields || []).map((field, index) => <p key={`vcf-${index}`} className="text-gray-700"><span className="font-semibold">{field.name || "Custom"}:</span> {field.value || "-"}</p>)}</div></div>
              </div>
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-md p-6"><h2 className="text-xl font-semibold text-gray-800 mb-3">Metadata</h2><p className="text-gray-700">Added on {createdText}</p><p className="text-gray-700 mt-2">Updated on {updatedText}</p>{contact.updatedAt && <p className="text-sm text-gray-500 mt-3">Updated {Math.max(0, Math.floor((Date.now() - new Date(contact.updatedAt).getTime()) / 86400000))} day(s) ago</p>}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-3">Delete Contact</h2>
            <p className="text-gray-600 mb-4">Are you sure you want to delete this contact? This action cannot be undone.</p>
            {deleteError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{deleteError}</div>}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}>Cancel</Button>
              <Button type="button" variant="danger" onClick={handleDelete} loading={deleteLoading}>Confirm Delete</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContactDetail;

