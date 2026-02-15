import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import api from "../utils/api";

const initialFormData = {
  name: "",
  phone: "",
  email: "",
  address: "",
};

const CreateContact = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: null,
      general: null,
    }));
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      await api.post("/contacts", {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
      });

      navigate("/dashboard", {
        state: { successMessage: "Contact created successfully." },
      });
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to create contact. Please try again.";

      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Create Contact</h1>
          <p className="text-gray-600 mb-6">Add a new contact to your address book</p>

          {errors.general && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <Input
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter contact name"
              required
              error={errors.name}
            />

            <Input
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
              required
              error={errors.phone}
            />

            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email address (optional)"
              error={errors.email}
            />

            <Input
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter address (optional)"
              error={errors.address}
            />

            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={loading}>
                Create Contact
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateContact;
