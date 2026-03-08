import Contact from "../models/Contact.js";

const createContact = async (req, res) => {
  try {
    const createdBy = req?.user?.id;

    if (!createdBy) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: user context is required",
      });
    }

    const contactData = {
      ...req.validatedContactData,
      createdBy,
    };

    const contact = await Contact.create(contactData);

    return res.status(201).json({
      success: true,
      message: "Contact created successfully",
      data: contact,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create contact",
      error: error.message,
    });
  }
};

export { createContact };
