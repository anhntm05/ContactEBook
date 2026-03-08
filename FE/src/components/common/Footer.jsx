const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <p>&copy; {new Date().getFullYear()} ContactHub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
