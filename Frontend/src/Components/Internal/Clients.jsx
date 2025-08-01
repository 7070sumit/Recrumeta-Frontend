import React, { useState, useEffect, useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Profile from "../../assets/ProfileIcon.png";
import { Toaster, toast } from 'react-hot-toast';
import debounce from 'lodash/debounce';
import { VisitorDisableWrapper } from '../Hooks/VisitorGuard';

const debouncedValidations = {
  email: debounce((value, toast) => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error('Please enter a valid email address');
    }
  }, 3000),

  gstin: debounce((value, toast) => {
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (value && value.length === 15 && !gstinRegex.test(value)) {
      toast.error('Please enter a valid GSTIN');
    }
  }, 500),

  phone: debounce((value, toast) => {
    if (value && (value.length !== 10 || !/^\d+$/.test(value))) {
      toast.error('Phone number must be 10 digits');
    }
  }, 500)
};

function Clients() {
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // States
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState({ status: "All" });
  const [previewImage, setPreviewImage] = useState(null);
  const [logofile, setLogofile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [originalData, setOriginalData] = useState([]);

  const [formData, setFormData] = useState({
    companyName: "",
    companywebsite: "",
    email: "",
    password: "",
    confirmPassword: "",
    gstin: "",
    industry: "",
    interviewAmount: "",
    address: "",
    companyLogo: "",
    pocName: "",
    pocContactNumber: "",
    pocEmail: "",
  });

  // Constants
  const statuses = ["All", "Active", "Inactive"];

  // Validation Functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateGSTIN = (gstin) => {
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin.toUpperCase());
  };

  const validatePhoneNumber = (phone) => {
    return phone.length === 10 && /^\d+$/.test(phone);
  };

  // Handlers
  const handleSelect = (category, value) => {
    setSelectedFilters(prev => ({
      ...prev,
      [category]: value,
    }));
  };

  const debouncedSearch = debounce((query) => {
    if (!query.trim()) {
      setData(originalData);
      return;
    }

    const filteredData = originalData.filter(client =>
      client.companyName.toLowerCase().includes(query.toLowerCase())
    );
    setData(filteredData);
  }, 300);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'gstin') {
      const upperValue = value.toUpperCase();
      setFormData(prev => ({
        ...prev,
        [name]: upperValue
      }));

      // Only validate if we have complete GSTIN length
      if (upperValue.length === 15) {
        debouncedValidations.gstin(upperValue, toast);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));

      // Other validations...
      if (value.trim()) {
        switch (name) {
          case 'email':
          case 'pocEmail':
            debouncedValidations.email(value.trim(), toast);
            break;
          case 'pocContactNumber':
            debouncedValidations.phone(value.trim(), toast);
            break;
        }
      }
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, or GIF)');
      return;
    }

    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setLogofile(file);
    setFormData(prev => ({ ...prev, companyLogo: file }));

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
      toast.success('Logo uploaded successfully');
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setPreviewImage(null);
    setLogofile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateForm = () => {
    // Add password fields back to required fields since they're in your form
    const requiredFields = {
      companyName: 'Client Name',
      email: 'Email',
      industry: 'Industry',
      gstin: 'GSTIN',
      address: 'Address',
      pocName: 'POC Name',
      pocEmail: 'POC Email',
      pocContactNumber: 'POC Contact Number',
      password: 'Password',
      confirmPassword: 'Confirm Password'
    };

    // First check password match
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }

    // Check required fields
    for (const [field, label] of Object.entries(requiredFields)) {
      const value = formData[field];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        toast.error(`${label} is required`);
        return false;
      }
    }

    // Validate GSTIN format
    if (!validateGSTIN(formData.gstin)) {
      toast.error('Please enter a valid GSTIN');
      return false;
    }

    // Validate email formats
    if (!validateEmail(formData.email)) {
      toast.error('Please enter a valid company email');
      return false;
    }
    if (!validateEmail(formData.pocEmail)) {
      toast.error('Please enter a valid POC email');
      return false;
    }

    // Validate phone number
    if (!validatePhoneNumber(formData.pocContactNumber)) {
      toast.error('Please enter a valid 10-digit phone number');
      return false;
    }

    // Check if logo is uploaded
    if (!logofile) {
      toast.error('Company logo is required');
      return false;
    }

    // If website URL is provided, validate it
    if (formData.companywebsite && formData.companywebsite.trim()) {
      try {
        new URL(formData.companywebsite);
      } catch (error) {
        toast.error('Please enter a valid website URL');
        return false;
      }
    }

    return true;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return; // Prevent double submission

    // Trim all form values
    const trimmedFormData = Object.fromEntries(
      Object.entries(formData).map(([key, value]) => [
        key,
        typeof value === 'string' ? value.trim() : value
      ])
    );
    setFormData(trimmedFormData);

    if (!validateForm()) {
      return;
    }

    const loadingToast = toast.loading('Adding client...');
    setIsSubmitting(true);

    try {
      const clientData = new FormData();

      // Append all form fields except logo
      Object.keys(trimmedFormData).forEach((key) => {
        if (key !== 'companyLogo') {
          clientData.append(key, trimmedFormData[key]);
        }
      });

      // Append logo if exists
      if (logofile) {
        clientData.append("companyLogo", logofile);
      }

      const response = await axios.post(
        `${baseUrl}/api/v1/internal/add-client`,
        clientData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      toast.dismiss(loadingToast);

      if (response.data.success) {
        toast.success('Client added successfully');
        navigate('/internal/clients');
      } else {
        toast.error(response.data.message || 'Failed to add client');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(error.response?.data?.message || 'Error adding client');
      console.error("Error during form submission:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch Clients Data
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(
          `${baseUrl}/api/v1/internal/getAllClients`,
          { withCredentials: true }
        );

        if (response.data.success) {
          setData(response.data.data);
          setOriginalData(response.data.data); // Keep original data for filtering
        } else {
          throw new Error(response.data.message || 'Failed to fetch clients');
        }
      } catch (error) {
        setError(error.message || 'Error fetching clients data');
        toast.error('Failed to load clients data');
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();

    // Cleanup function
    return () => {
      setData([]);
      setOriginalData([]);
    };
  }, [baseUrl]);

  useEffect(() => {
    // Clear form errors on mount
    return () => {
      setError(null);
      setIsSubmitting(false);
    };
  }, []);

  // Add error handling middleware
  const handleError = (error) => {
    console.error('Form Error:', error);
    setError(error.message || 'An unexpected error occurred');
    toast.error(error.response?.data?.message || 'Error submitting form');
    setIsSubmitting(false);
  };

  // Loading Component
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col bg-[#EBDFD7] items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#E65F2B]"></div>
        <p className="mt-4 text-lg font-medium text-gray-600">Loading Clients Data...</p>
        <p className="text-sm text-gray-500">Please wait while we fetch the latest information</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col bg-[#EBDFD7] items-center justify-center">
        <div className="text-[#E65F2B] text-6xl mb-4">⚠️</div>
        <p className="text-lg font-medium text-gray-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2 bg-[#E65F2B] text-white rounded-full hover:bg-[#cd4b18] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#EBDFD7] p-6">
      <Toaster
        position="bottom-right"
        reverseOrder={true}
        toastOptions={{
          className: '',
          duration: 3000,
          style: {
            background: '#FFFFFF',
            color: '#374151',
            border: '2px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
          },
          success: {
            style: {
              border: '2px solid #359E45',
            },
            iconTheme: {
              primary: '#359E45',
              secondary: 'white',
            },
          },
          error: {
            style: {
              border: '2px solid #EF4444',
            },
            iconTheme: {
              primary: '#EF4444',
              secondary: 'white',
            },
          },
        }}
        gutter={-40}
        containerStyle={{
          bottom: '40px',
          right: '50px',
        }}
      />
      <div>
        {location.pathname === "/internal/clients" && (
          <div>
            {/* Search and Add Client Section */}
            <div className="flex flex-col justify-end sm:flex-row sm:items-center sm:space-x-4 space-y-4 sm:space-y-0 ml-auto">
              {/* Search Input */}
              <div className="flex items-center bg-white rounded-full px-4 py-2 w-full sm:w-80">
                <input
                  type="text"
                  value={searchQuery}  // Add this
                  onChange={handleSearch}  // Add this
                  placeholder="Search Client by name"
                  className="flex-1 bg-transparent text-gray-600 outline-none text-sm"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 -960 960 960"
                  width="24px"
                  fill="#000000"
                >
                  <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z" />
                </svg>
              </div>

              {/* Add Client Button */}
              <VisitorDisableWrapper>
                <button
                  className="relative w-[160px] h-10 flex items-center rounded-full border-[1px] border-[#E65F2B] overflow-hidden bg-[#ffffff] cursor-pointer transition-all duration-300 hover:bg-[#E65F2B] active:border-[#E65F2B] group"
                  onClick={() => navigate(`${location.pathname}/addclient`)}
                >
                  <span className="absolute right-0 h-full w-[39px] bg-[#cd4b18] flex items-center justify-center transition-all duration-300 group-hover:w-full group-hover:translate-x-0 active:bg-green-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      stroke-width="2"
                      stroke-linejoin="round"
                      stroke-linecap="round"
                      stroke="currentColor"
                      fill="none"
                      class="stroke-white"
                    >
                      <line y2="19" y1="5" x2="12" x1="12"></line>
                      <line y2="12" y1="12" x2="19" x1="5"></line>
                    </svg>
                  </span>
                  <span className=" pl-2 absolute left-2 text-[#E65F2B] font-semibold transition-all duration-300 group-hover:text-transparent">
                    Add Client
                  </span>
                </button>
              </VisitorDisableWrapper>
            </div>
            {/* Domain and Status Filters */}
            <div className="space-y-2 mt-1">
              {/* Status Filter */}
              <div className="flex items-center space-x-1">
                <span className="text-sm font-bold mr-4">Status</span>
                {statuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleSelect("status", status)}
                    className={`flex items-center justify-center px-2 py-1 border rounded-2xl text-[12px] w-auto ${selectedFilters.status === status
                      ? "bg-[#E65F2B] text-white border-[#E65F2B]"
                      : "bg-[#F6F1EE] text-[#E65F2B] border-[#E65F2B]"
                      }`}
                  >
                    {/* Tick container */}

                    {selectedFilters.status === status && (
                      <span className="w-4 h-4 flex justify-center items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-5 h-5 text-white-700"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </span>
                    )}
                    &nbsp;
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Section */}
            <div className="w-[100%] bg-[rgba(255,255,255,0.34)] rounded-xl shadow-md overflow-hidden mt-6">
              <table className="w-[100%] h-[100%]">
                <thead className="border-b-2 border-[#E65F2B]/20">
                  <tr>
                    <th scope="col" className="py-4 px-20 text-left font-bold text-[#E65F2B]">
                      Client
                    </th>
                    <th
                      scope="col"
                      className="py-4 px-6 font-bold text-[#E65F2B]"
                    >
                      Active Jobs
                    </th>
                    {/* <th scope="col" className="px-6 py-4 whitespace-nowrap text-center">
                      Passive Jobs
                    </th> */}
                    <th
                      scope="col"
                      className="py-4 px-6 font-bold text-[#E65F2B]"
                    >
                      Total Candidates
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(data) ? (
                    data.map((client, index) => (
                      <tr key={client.id} className="border-b border-gray-200 hover:bg-[#F6F1EE]/50 transition-colors">
                        <td className="py-3 px-6 text-center">
                          <div className="flex items-center gap-4">
                            <img
                              src={Profile}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = Profile;
                              }}
                              alt="Company Logo"
                              className="w-10 h-10 rounded-full"
                            />
                            <span>{client.companyName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-6 max-w-max text-center">
                          {client.totalJobs}
                        </td>
                        {/* Uncomment below if needed */}
                        {/* <td className="px-6 py-4 text-center">{client.passiveJobs}</td> */}
                        <td className="py-3 px-6 max-w-max text-center">
                          {client.totalCandidates}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="py-3 px-6 max-w-max text-center">
                        No Data Available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Client Section */}
      <div className="flex flex-col items-center justify-center">
        {location.pathname === "/internal/clients/addclient" && (
          <form action="" className="m-2 p-6 w-[95%] h-[95%] bg-[#F2EAE5] rounded-2xl shadow-md">
            <div>
              <div>
                <p className="text-[24px] font-semibold">Add Client</p>
              </div>

              {/* Company Logo */}
              <div className="pt-2">
                <ul className="grid">
                  <li className="flex items-center justify-center gap-x-4 ">
                    <div className="w-full max-w-md mx-auto">
                      <div className="relative w-[150px] h-[150px] mx-auto rounded-full border-[#E65F2B] hover:border-[#E65F2B] transition-all duration-300 group" >
                        <input
                          id="logoUpload"
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <div
                          className={`w-full h-full flex items-center border-2 border-dashed justify-center transition-all duration-300 ease-in-out bg-[#F6F1EE] rounded-full
                            ${previewImage
                              ? "border-green-500 bg-green-50"
                              : "border-orange-300 hover:border-[#E65F2B] hover:bg-[#FADFD5]"
                            }
                            `}
                        >
                          {previewImage ? (
                            <div className="relative w-full h-full flex items-center justify-center p-4">
                              <img
                                src={previewImage}
                                alt="Company Logo"
                                className="max-w-full max-h-full object-contain rounded-full"
                              />
                              <button
                                onClick={clearImage}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors duration-300"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          ) : (
                            <label
                              htmlFor="logoUpload"
                              className="flex flex-col items-center justify-center cursor-pointer text-gray-500 hover:text-[#E65F2B] transition-colors"
                            >
                              <ImagePlus className="w-10 h-10 mb-2" />
                              <span className="text-sm font-medium text-center">
                                Upload Company<br></br>Logo
                              </span>
                            </label>
                          )}
                        </div>
                      </div>
                      {/* File Details */}
                      {logofile && (
                        <div className="mt-2 text-center text-xs text-gray-500">
                          <p className="truncate">{logofile.name}</p>
                          <p>{(logofile.size / 1024).toFixed(2)} KB</p>
                        </div>
                      )}
                    </div>
                  </li>
                </ul>
              </div>

              {/* Data 1 */}
              <div className="pt-4">
                <div className="grid grid-cols-3 gap-x-10 gap-y-2">
                  {/* First Row */}
                  <div className="flex flex-col">
                    <label className="mb-2 text-gray-700">Client Name</label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      placeholder="Enter Client Name"
                      className="h-[37px] px-4 border-2 rounded-xl outline-none transition-all duration-200 text-[15px] bg-[#F6F1EE] shadow-sm border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#E65F2B]"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="mb-2 text-gray-700">Website</label>
                    <input
                      type="url"
                      name="companywebsite"
                      value={formData.companywebsite}
                      onChange={handleChange}
                      placeholder="Enter Website URL"
                      className="h-[37px] px-4 border-2 rounded-xl outline-none transition-all duration-200 text-[15px] bg-[#F6F1EE] shadow-sm border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#E65F2B]"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="mb-2 text-gray-700">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter Email"
                      className="h-[37px] px-4 border-2 rounded-xl outline-none transition-all duration-200 text-[15px] bg-[#F6F1EE] shadow-sm border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#E65F2B]"
                    />
                  </div>

                  {/* Second Row */}
                  <div className="flex flex-col">
                    <label className="mb-2 text-gray-700">Industry</label>
                    <input
                      type="text"
                      name="industry"
                      value={formData.industry}
                      onChange={handleChange}
                      placeholder="Enter Industry"
                      className="h-[37px] px-4 border-2 rounded-xl outline-none transition-all duration-200 text-[15px] bg-[#F6F1EE] shadow-sm border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#E65F2B]"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="mb-2 text-gray-700">Password</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter Password"
                      className="h-[37px] px-4 border-2 rounded-xl outline-none transition-all duration-200 text-[15px] bg-[#F6F1EE] shadow-sm border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#E65F2B]"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="mb-2 text-gray-700">Confirm Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Enter Confirm Password"
                      className="h-[37px] px-4 border-2 rounded-xl outline-none transition-all duration-200 text-[15px] bg-[#F6F1EE] shadow-sm border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#E65F2B]"
                    />
                  </div>

                  {/* Third Row */}
                  <div className="flex flex-col">
                    <label className="mb-2 text-gray-700">GSTIN</label>
                    <input
                      type="text"
                      name="gstin"
                      value={formData.gstin}
                      onChange={handleChange}
                      maxLength={15}
                      placeholder="Enter GSTIN"
                      style={{ textTransform: 'uppercase' }}
                      className="h-[37px] px-4 border-2 rounded-xl outline-none transition-all duration-200 text-[15px] bg-[#F6F1EE] shadow-sm border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#E65F2B]"
                    />
                    <style>
                      {`
                        input[name="gstin"]::placeholder {
                          text-transform: none; /* Keeps placeholder text in its original case */
                        }
                      `}
                    </style>
                  </div>

                  <div className="flex flex-col">
                    <label className="mb-2 text-gray-700">Address</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Enter Address"
                      className="h-[37px] px-4 border-2 rounded-xl outline-none transition-all duration-200 text-[15px] bg-[#F6F1EE] shadow-sm border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#E65F2B]"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="mb-2 text-gray-700">Interview Amount</label>
                    <input
                      type="number"
                      name="interviewAmount"
                      value={formData.interviewAmount}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only positive numbers or empty input
                        if (value === "" || Number(value) >= 0) {
                          setFormData({ ...formData, interviewAmount: value });
                        }
                      }}
                      min="1"
                      placeholder="Enter Amount"
                      className="h-[37px] px-4 border-2 rounded-xl outline-none transition-all duration-200 text-[15px] bg-[#F6F1EE] shadow-sm border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#E65F2B]"
                    />
                  </div>
                </div>
              </div>

              {/* Data 2 */}
              <div className="pt-6">
                <div className="grid grid-cols-3 gap-x-10 gap-y-2">
                  <h2 className="text-[20px] font-semibold col-span-3">
                    Point of Contact
                  </h2>
                  {/* First Row */}
                  <div className="flex flex-col">
                    <label className="mb-2 text-gray-700">POC Name</label>
                    <input
                      type="text"
                      name="pocName"
                      value={formData.pocName}
                      onChange={handleChange}
                      placeholder="Enter POC Name"
                      className="h-[37px] px-4 border-2 rounded-xl outline-none transition-all duration-200 text-[15px] bg-[#F6F1EE] shadow-sm border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#E65F2B]"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="mb-2 text-gray-700">Email</label>
                    <input
                      type="email"
                      name="pocEmail"
                      value={formData.pocEmail}
                      onChange={handleChange}
                      placeholder="Enter Email"
                      className="h-[37px] px-4 border-2 rounded-xl outline-none transition-all duration-200 text-[15px] bg-[#F6F1EE] shadow-sm border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#E65F2B]"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="mb-2 text-gray-700">Phone</label>
                    <input
                      type="number"
                      name="pocContactNumber"
                      value={formData.pocContactNumber}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only positive numbers or empty input
                        if (value === "" || Number(value) >= 0) {
                          setFormData({ ...formData, pocContactNumber: value });
                        }
                      }}
                      placeholder="Enter Phone Number"
                      className="h-[37px] px-4 border-2 rounded-xl outline-none transition-all duration-200 text-[15px] bg-[#F6F1EE] shadow-sm border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#E65F2B]"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end mt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className={`h-[40px] flex items-center gap-2 
                    ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                    } text-[#E65F2B] bg-white px-6 py-3 rounded-full text-[18px] font-medium shadow-md transition-all duration-200 hover:shadow-lg hover:translate-y-[-2px] active:translate-y-[0px] active:shadow-md group`}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                  {!isSubmitting &&
                    <svg className="transition-transform duration-200 group-hover:rotate-[-45deg]" width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M20.7179 10.8489C20.8466 10.9778 20.9189 11.1525 20.9189 11.3347C20.9189 11.5169 20.8466 11.6916 20.7179 11.8206L14.3131 18.2372C14.2497 18.3029 14.1739 18.3553 14.09 18.3914C14.0062 18.4275 13.916 18.4465 13.8247 18.4473C13.7334 18.4481 13.6429 18.4308 13.5584 18.3963C13.4739 18.3617 13.3971 18.3107 13.3325 18.2462C13.2679 18.1817 13.2168 18.1049 13.1822 18.0205C13.1476 17.936 13.1302 17.8455 13.1309 17.7542C13.1317 17.6629 13.1506 17.5727 13.1866 17.4888C13.2226 17.4049 13.2749 17.329 13.3406 17.2656L18.5729 12.0231L3.73205 12.0332C3.54972 12.0335 3.37475 11.9613 3.24565 11.8325C3.11654 11.7037 3.04388 11.529 3.04363 11.3466C3.04339 11.1643 3.11559 10.9893 3.24435 10.8602C3.37311 10.7311 3.54788 10.6585 3.73022 10.6582L18.5747 10.6491L13.3396 5.40389C13.274 5.34044 13.2217 5.26455 13.1857 5.18066C13.1497 5.09676 13.1308 5.00654 13.13 4.91525C13.1293 4.82397 13.1467 4.73345 13.1813 4.64897C13.2159 4.5645 13.267 4.48776 13.3316 4.42324C13.3962 4.35872 13.4729 4.30771 13.5575 4.27318C13.642 4.23865 13.7325 4.2213 13.8238 4.22214C13.9151 4.22297 14.0053 4.24198 14.0891 4.27805C14.173 4.31412 14.2488 4.36653 14.3122 4.43222L20.7179 10.8489Z" fill="#E65F2B" />
                    </svg>
                  }
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export { Clients as InternalClients };
