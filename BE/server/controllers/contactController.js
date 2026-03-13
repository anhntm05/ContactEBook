import {
  ContactServiceError,
  createContactService,
  getContactByIdService,
  getContactsService,
  searchContactsService,
  updateContactService,
} from "../services/contactService.js";

const getContacts = async (req, res) => {
  try {
    const contacts = await getContactsService(req);
    return res.status(200).json({
      success: true,
      data: contacts,
    });
  } catch (error) {
    if (error instanceof ContactServiceError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to fetch contacts",
      error: error.message,
    });
  }
};

const searchContacts = async (req, res) => {
  try {
    const contacts = await searchContactsService(req);
    return res.status(200).json({
      success: true,
      data: contacts,
    });
  } catch (error) {
    if (error instanceof ContactServiceError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to search contacts",
      error: error.message,
    });
  }
};

const getContactById = async (req, res) => {
  try {
    const contact = await getContactByIdService(req);
    return res.status(200).json({
      success: true,
      data: contact,
    });
  } catch (error) {
    if (error instanceof ContactServiceError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to fetch contact details",
      error: error.message,
    });
  }
};

const createContact = async (req, res) => {
  try {
    const contact = await createContactService(req);
    return res.status(201).json({
      success: true,
      message: "Contact created successfully",
      data: contact,
    });
  } catch (error) {
    if (error instanceof ContactServiceError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create contact",
      error: error.message,
    });
  }
};

const updateContact = async (req, res) => {
  try {
    const contact = await updateContactService(req);
    return res.status(200).json({
      success: true,
      message: "Contact updated successfully",
      data: contact,
    });
  } catch (error) {
    if (error instanceof ContactServiceError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update contact",
      error: error.message,
    });
  }
};

export { createContact, getContactById, getContacts, searchContacts, updateContact };
