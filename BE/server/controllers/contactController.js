import {
  ContactServiceError,
  createContactService,
  deleteContactService,
  deleteManyContactsService,
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
      const payload = {
        success: false,
        message: error.message,
      };

      if (error.errors) {
        payload.errors = error.errors;
      }

      if (error.fieldErrors) {
        payload.fieldErrors = error.fieldErrors;
      }

      return res.status(error.statusCode).json(payload);
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

const deleteContact = async (req, res) => {
  try {
    const result = await deleteContactService(req);
    return res.status(200).json({
      success: true,
      message: "Contact deleted successfully",
      data: result,
    });
  } catch (error) {
    if (error instanceof ContactServiceError) {
      const payload = {
        success: false,
        message: error.message,
      };

      if (error.errors) {
        payload.errors = error.errors;
      }

      if (error.fieldErrors) {
        payload.fieldErrors = error.fieldErrors;
      }

      return res.status(error.statusCode).json(payload);
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete contact",
      error: error.message,
    });
  }
};

const deleteManyContacts = async (req, res) => {
  try {
    const result = await deleteManyContactsService(req);
    return res.status(200).json({
      success: true,
      message:
        result.deletedCount > 1
          ? "Contacts deleted successfully"
          : "Contact deleted successfully",
      data: result,
    });
  } catch (error) {
    if (error instanceof ContactServiceError) {
      const payload = {
        success: false,
        message: error.message,
      };

      if (error.errors) {
        payload.errors = error.errors;
      }

      if (error.fieldErrors) {
        payload.fieldErrors = error.fieldErrors;
      }

      return res.status(error.statusCode).json(payload);
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete contacts",
      error: error.message,
    });
  }
};

export {
  createContact,
  deleteContact,
  deleteManyContacts,
  getContactById,
  getContacts,
  searchContacts,
  updateContact,
};
