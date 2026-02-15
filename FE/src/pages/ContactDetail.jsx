import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import api from "../utils/api";
import { getInitials } from "../utils/helpers";

const buildFormData = (contact) => ({
  name: contact?.name || "",
  phone: contact?.phone || "",
  email: contact?.email || "",
  address: contact?.address || "",
});

const ContactDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [notFound, setNotFound] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(buildFormData(null));
  const [formErrors, setFormErrors] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const fetchContact = async () => {
    try {
      setLoading(true);
      setFetchError("");
      setNotFound(false);

      const response = await api.get(`/contacts/${id}`);
      const contactData = response.data?.data || response.data;

      if (!contactData) {
        setContact(null);
        setNotFound(true);
        return;
      }

      setContact(contactData);
      setFormData(buildFormData(contactData));
    } catch (error) {
      if (error.response?.status === 404) {
        setNotFound(true);
      } else {
        const message =
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to load contact details.";
        setFetchError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContact();
  }, [id]);

  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone is required";
    }

    if (formData.email.trim() && !emailRegex.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setFormErrors((prev) => ({
      ...prev,
      [name]: null,
      general: null,
    }));
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setSaveSuccess("");
    setFormErrors({});
    setFormData(buildFormData(contact));
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormErrors({});
    setFormData(buildFormData(contact));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }

    setSaveLoading(true);

    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      address: formData.address.trim(),
    };

    try {
      const response = await api.put(`/contacts/${id}`, payload);
      const updatedContact = response.data?.data || { ...contact, ...payload };

      setContact(updatedContact);
      setFormData(buildFormData(updatedContact));
      setIsEditing(false);
      setSaveSuccess("Contact updated successfully.");
      setFormErrors({});
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to update contact. Please try again.";

      setFormErrors((prev) => ({
        ...prev,
        general: message,
      }));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    setDeleteError("");

    try {
      await api.delete(`/contacts/${id}`);
      navigate("/dashboard", {
        state: { successMessage: "Contact deleted successfully." },
      });
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to delete contact. Please try again.";
      setDeleteError(message);
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
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-3">Contact Not Found</h1>
          <p className="text-gray-600 mb-6">
            The contact you are looking for does not exist or was removed.
          </p>
          <Button variant="primary" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-3">Unable to Load Contact</h1>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {fetchError}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={fetchContact}>
              Try Again
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-3">No Contact Data</h1>
          <p className="text-gray-600 mb-6">No details are available for this contact.</p>
          <Button variant="primary" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>

          {saveSuccess && (
            <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {saveSuccess}
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center text-xl font-bold">
                  {getInitials(contact.name)}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">{contact.name}</h1>
                  <p className="text-gray-600">Contact Details</p>
                </div>
              </div>

              {!isEditing && (
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={handleStartEdit}>
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setDeleteError("");
                      setShowDeleteModal(true);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSave}>
                {formErrors.general && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {formErrors.general}
                  </div>
                )}

                <Input
                  label="Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter contact name"
                  required
                  error={formErrors.name}
                />

                <Input
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  required
                  error={formErrors.phone}
                />

                <Input
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address (optional)"
                  error={formErrors.email}
                />

                <Input
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter address (optional)"
                  error={formErrors.address}
                />

                <div className="flex items-center justify-end gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={saveLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" loading={saveLoading}>
                    Save Changes
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-semibold text-gray-500">Name</p>
                  <p className="text-lg text-gray-800">{contact.name}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-500">Phone</p>
                  <p className="text-lg text-gray-800">{contact.phone || "Not provided"}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-500">Email</p>
                  <p className="text-lg text-gray-800">{contact.email || "Not provided"}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-500">Address</p>
                  <p className="text-lg text-gray-800">{contact.address || "Not provided"}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Delete Contact</h2>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this contact? This action cannot be undone.
            </p>

            {deleteError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                loading={deleteLoading}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContactDetail;
