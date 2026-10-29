import { useState, useEffect, useRef } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import axios from "axios";
import { toast } from "react-toastify";
import { Header } from "./Header";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001";


const PROJECT_TYPES = [
  { name: "New City", code: "NCG" },
  { name: "New City 1", code: "NCS" },
    { name: "New City North", code: "NCL" },
];

const defaultFormData = {
  societyName: "NAVANAGARA HOUSE BUILDING CO-OPERATIVE SOCIETY LTD.",
  societyNameKannada: "ನವನಗರ ಹೌಸ್ ಬಿಲ್ಡಿಂಗ್ ಕೋ-ಆಪರೇಟಿವ್ ಸೊಸೈಟಿ ಲಿ.",
  societyAddress:
    "No.1123, 'A' Block, 20th Cross, Sahakara Nagar, Bangalore - 560092",
  regNo: "Reg. No: JRB/RGN/CR-04/51588/2024-2025",
  website: "www.navanagarahousebuildingsociety.in",
  email: "Email-navanagarahousingsociety@gmail.com",
  receiptNo: "",
  receiptDate: new Date().toISOString().split("T")[0],
  receivedFrom: "",
  membershipId: "",
  phoneNumber: "",
  Email: "",
  siteDimension: "",
  flatNumber: "",
  projectType: "New City",
  seniorityNumber: "",
  paymentMode: "Cheque",
  bankName: "State Bank Of India",
  branch: "",
  chequeNo: "",
};

// Payment items list
const paymentItemsList = [
  "Share",
  "Membership Fee",
  "Admission Fee",
  "Share Fee",
  "Deposits",
  "Booking Advance",
  "Down Payment",
  "1st Installment",
  "2nd Installment",
  "3rd Installment",
  "Penalty",
  "Miscellaneous",
];

const MEMBERSHIP_BREAKDOWN = {
  Share: 2000,
  "Membership Fee": 200,
  "Admission Fee": 150,
  "Share Fee": 150,
};

const TOTAL_MEMBERSHIP_FEE = 2500;

const ReceiptForm = ({ initialData = {}, onReceiptGenerate = null }) => {
  const [showReceipt, setShowReceipt] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [paymentItemsError, setPaymentItemsError] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [memberExists, setMemberExists] = useState(false);
  const [hasExistingReceipt, setHasExistingReceipt] = useState(false);
  const [memberValidationMessage, setMemberValidationMessage] = useState("");
  const [isCheckingMember, setIsCheckingMember] = useState(false);
  const receiptRef = useRef(null);
  const [memberAddresses, setMemberAddresses] = useState([]);

  const [seniorityInput, setSeniorityInput] = useState("");

  const ADMIN_NAMES = ["Vanita", "Sonakshi", "Anitha"];
  const [createdBy, setCreatedBy] = useState(ADMIN_NAMES[0]);

  const [transactionIds, setTransactionIds] = useState([""]);

  const [selectedBanks, setSelectedBanks] = useState([
    { bank: "State Bank Of India", branch: "" },
  ]);

  const [bookingAdvanceRows, setBookingAdvanceRows] = useState([
    { amount: 0, checked: false },
  ]);

  const paymentModes = [
    "Cheque",
    "Cash",
    "Online Transfer",
    "DD",
    "UPI",
    "NEFT/RTGS",
  ];

  const banks = [
    "State Bank Of India",
    "HDFC Bank",
    "ICICI Bank",
    "Axis Bank",
    "Punjab National Bank",
    "Bank of Baroda",
    "Canara Bank",
    "Union Bank of India",
    "Kotak Mahindra Bank",
    "IndusInd Bank",
  ];

  const [paymentItems, setPaymentItems] = useState(
    paymentItemsList
      .filter((item) => item !== "Booking Advance")
      .map((item) => ({
        name: item,
        checked: false,
        amount: 0,
      })),
  );

  const addTransactionId = () => {
    if (transactionIds.length < 3) {
      setTransactionIds([...transactionIds, ""]);
    }
  };

  const removeTransactionId = (index) => {
    if (transactionIds.length > 1) {
      const updated = transactionIds.filter((_, i) => i !== index);
      setTransactionIds(updated);
      formik.setFieldValue("chequeNo", updated[0] || "");
    }
  };

  const updateTransactionId = (index, value) => {
    const updated = [...transactionIds];
    updated[index] = value;
    setTransactionIds(updated);
    formik.setFieldValue("chequeNo", updated[0] || "");
  };

  const addBank = () => {
    if (selectedBanks.length < 3) {
      setSelectedBanks([...selectedBanks, { bank: "", branch: "" }]);
    }
  };

  const removeBank = (index) => {
    if (selectedBanks.length > 1) {
      const updated = selectedBanks.filter((_, i) => i !== index);
      setSelectedBanks(updated);
      formik.setFieldValue("bankName", updated[0]?.bank || "");
      formik.setFieldValue("branch", updated[0]?.branch || "");
    }
  };

  const updateBankField = (index, field, value) => {
    const updated = [...selectedBanks];
    updated[index][field] = value;
    setSelectedBanks(updated);
    formik.setFieldValue("bankName", updated[0]?.bank || "");
    formik.setFieldValue("branch", updated[0]?.branch || "");
  };

  const addBookingAdvanceRow = () => {
    if (bookingAdvanceRows.length < 3) {
      setBookingAdvanceRows([
        ...bookingAdvanceRows,
        { amount: 0, checked: false },
      ]);
    }
  };

  const removeBookingAdvanceRow = (index) => {
    if (bookingAdvanceRows.length > 1) {
      setBookingAdvanceRows(bookingAdvanceRows.filter((_, i) => i !== index));
    }
  };

  const updateBookingAdvanceRow = (index, field, value) => {
    const updated = [...bookingAdvanceRows];
    updated[index] = { ...updated[index], [field]: value };
    setBookingAdvanceRows(updated);
  };

  const checkMemberAndReceipts = async (seniorityNumber) => {
    if (!seniorityNumber || seniorityNumber.length < 3) {
      setMemberExists(false);
      setHasExistingReceipt(false);
      setMemberValidationMessage("");
      setMemberAddresses([]);
      return;
    }

    setIsCheckingMember(true);

    try {
      const membersResponse = await axios.get(`${API_BASE}/members`);
      const members = membersResponse.data.data || [];
      const memberFound = members.find(
        (m) => m.seniority_no === seniorityNumber,
      );

      const sitebookingsResponse = await axios.get(
         `${API_BASE}/sitebookings`,
      );
      const sitebookings = sitebookingsResponse.data || [];
      const siteBookingFound = sitebookings.find(
        (s) => s.seniority_no === seniorityNumber,
      );

      const exists = !!(memberFound && siteBookingFound);
      setMemberExists(exists);

      if (memberFound && !siteBookingFound) {
        setMemberValidationMessage(
          "⚠️ Member found but no Site Booking exists. Please create a Site Booking first.",
        );
        setIsCheckingMember(false);
        return;
      }

      if (exists) {
        const foundMember = memberFound || siteBookingFound;
        if (foundMember && foundMember.name) {
          formik.setFieldValue("receivedFrom", foundMember.name);
        }
        if (foundMember && foundMember.email) {
          formik.setFieldValue("Email", foundMember.email);
        }
        if (foundMember && foundMember.mobile) {
          formik.setFieldValue("phoneNumber", foundMember.mobile);
        }
        if (siteBookingFound && siteBookingFound.sitedimension) {
          formik.setFieldValue("siteDimension", siteBookingFound.sitedimension);
        }

        const addresses = [];
        if (memberFound?.permanentaddress)
          addresses.push({
            label: "Permanent Address",
            value: memberFound.permanentaddress,
          });
        if (memberFound?.correspondenceaddress)
          addresses.push({
            label: "Correspondence Address",
            value: memberFound.correspondenceaddress,
          });
        setMemberAddresses(addresses);
        if (addresses.length > 0) {
          formik.setFieldValue("flatNumber", addresses[0].value);
        }

        const receiptsResponse = await axios.get(
           `${API_BASE}/receipts`,
        );
        const receipts = receiptsResponse.data.data || [];
        const existingReceipt = receipts.find(
          (r) => r.seniority_no === seniorityNumber,
        );

        setHasExistingReceipt(!!existingReceipt);

        if (existingReceipt) {
          setMemberValidationMessage(
            "✅ Member found. Previous receipt exists - No membership fee required.",
          );
        } else {
          setMemberValidationMessage(
            "✅ Member found. First receipt - ₹2,500 membership fee will be adjusted from your payment.",
          );
        }
      } else {
        setMemberValidationMessage(
          "❌ Member not found. Please add member first in Members or Site Booking.",
        );
      }
    } catch (error) {
      console.error("Error checking member:", error);
      setMemberValidationMessage(
        "⚠️ Error checking member details. Please check your connection.",
      );
      setMemberExists(false);
    } finally {
      setIsCheckingMember(false);
    }
  };

  // Validation Schema
  const validationSchema = Yup.object().shape({
   receiptNo: Yup.string()
  .required("Receipt number is required")
  .matches(
    /^[0-9]+$/,
    "Only numbers allowed",
  ),
    receiptDate: Yup.date().required("Date is required"),
    receivedFrom: Yup.string()
      .required("Received from name is required")
      .min(2, "Minimum 2 characters required")
      .matches(/^[a-zA-Z\s.]+$/, "Only letters, spaces, and periods allowed"),
    phoneNumber: Yup.string()
      .matches(
        /^(\+?[1-9]\d{0,3}|0)?[6-9]\d{9}$/,
        "Enter a valid contact number",
      )
      .required("Phone number is required"),
    Email: Yup.string()
      .required("Email is required")
      .email("Enter valid email"),
    flatNumber: Yup.string()
      .required("Address is required")
      .min(10, "Please provide complete address (minimum 10 characters)"),
    seniorityNumber: Yup.string().required("Seniority number is required"),
    paymentMode: Yup.string().required("Payment mode is required"),
   bankName: Yup.string().when("paymentMode", {
         is: (val) => val !== "Cash",
         then: (schema) =>
           schema.required("Bank name required for non-cash payments"),
         otherwise: (schema) => schema.notRequired(),
       }),
       branch: Yup.string().when("paymentMode", {
         is: (val) => val !== "Cash",
         then: (schema) =>
           schema.required("Branch name required for non-cash payments"),
         otherwise: (schema) => schema.notRequired(),
       }),
       chequeNo: Yup.string().when("paymentMode", {
         is: (val) => val !== "Cash",
         then: (schema) => schema.required("Transaction ID is required"),
         otherwise: (schema) => schema.notRequired(),
       }),
  });

  // Formik setup
  const formik = useFormik({
    initialValues: { ...defaultFormData, ...initialData },
    validationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: (values) => {
      if (validatePaymentItems()) {
        setShowReceipt(true);
      }
    },
  });

  // Check member and receipts when seniority number changes
  useEffect(() => {
    checkMemberAndReceipts(formik.values.seniorityNumber);
  }, [formik.values.seniorityNumber]);

  // auto-build full seniority number when project or digits change
  useEffect(() => {
    if (formik.values.projectType && seniorityInput) {
      const selectedProject = PROJECT_TYPES.find(
        (p) => p.name === formik.values.projectType,
      );
      if (selectedProject) {
        const padded = seniorityInput.padStart(3, "0");
        formik.setFieldValue(
          "seniorityNumber",
          `${selectedProject.code}-${padded}`,
        );
      }
    } else {
      formik.setFieldValue("seniorityNumber", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.projectType, seniorityInput]);

  const handleSeniorityInputChange = (e) => {
    setSeniorityInput(e.target.value.replace(/\D/g, "").slice(0, 3));
  };

  // Validate payment items
  const validatePaymentItems = () => {
    const checkedItems = paymentItems.filter(
      (item) => item.checked && parseFloat(item.amount || 0) > 0,
    );
    const bookingAdvanceTotal = bookingAdvanceRows.reduce(
      (sum, row) => sum + (row.checked ? parseFloat(row.amount) || 0 : 0),
      0,
    );

    if (checkedItems.length === 0 && bookingAdvanceTotal === 0) {
      setPaymentItemsError(
        "Select at least one payment item with valid amount",
      );
      return false;
    }

    const total = calculateTotal();
    if (total === 0) {
      setPaymentItemsError("Total amount cannot be zero");
      return false;
    }

    setPaymentItemsError("");
    return true;
  };

  // Handle payment item changes
  const handlePaymentItemChange = (index, field, value) => {
    setPaymentItems((prev) => {
      const updated = [...prev];
      const itemName = updated[index].name;

      if (field === "checked") {
        if (MEMBERSHIP_BREAKDOWN[itemName] !== undefined) {
          updated[index] = {
            ...updated[index],
            checked: value,
            amount: value ? MEMBERSHIP_BREAKDOWN[itemName] : 0,
          };
        } else {
          updated[index] = { ...updated[index], [field]: value };
        }
      } else if (field === "amount") {
        if (MEMBERSHIP_BREAKDOWN[itemName] === undefined) {
          const numValue = parseFloat(value);
          if (
            value === "" ||
            (!isNaN(numValue) && numValue >= 0 && numValue <= 100000000)
          ) {
            updated[index] = { ...updated[index], [field]: value };
          }
        }
      }

      return updated;
    });

    if (field === "checked" && value === true) {
      setPaymentItemsError("");
    }
  };

  // Convert number to words
  const numberToWords = (num) => {
    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];
    const teens = [
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];

    if (num === 0) return "Zero";

    const convertLessThanThousand = (n) => {
      if (n === 0) return "";
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100)
        return (
          tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "")
        );
      return (
        ones[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 !== 0 ? " " + convertLessThanThousand(n % 100) : "")
      );
    };

    if (num < 1000) return convertLessThanThousand(num);

    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const remainder = num % 1000;

    let result = "";
    if (crore > 0) result += convertLessThanThousand(crore) + " Crore ";
    if (lakh > 0) result += convertLessThanThousand(lakh) + " Lakh ";
    if (thousand > 0)
      result += convertLessThanThousand(thousand) + " Thousand ";
    if (remainder > 0) result += convertLessThanThousand(remainder);

    return result.trim();
  };

  // Calculate total — always uses raw entered amounts
  const calculateTotal = () => {
    const itemsTotal = paymentItems.reduce((sum, item) => {
      return sum + (item.checked ? parseFloat(item.amount || 0) : 0);
    }, 0);
    const bookingAdvanceTotal = bookingAdvanceRows.reduce(
      (sum, row) => sum + (row.checked ? parseFloat(row.amount) || 0 : 0),
      0,
    );
    return itemsTotal + bookingAdvanceTotal;
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    if (!memberExists) {
      toast.error(
        "❌ Member not found! Please add the member in Members or Site Booking first.",
      );
      return;
    }

    const errors = await formik.validateForm();
    formik.setTouched({
      receiptNo: true,
      receiptDate: true,
      receivedFrom: true,
      phoneNumber: true,
      Email: true,
      flatNumber: true,
      seniorityNumber: true,
      bankName: true,
      branch: true,
      chequeNo: true,
    });

    const paymentItemsOk = validatePaymentItems();
    if (Object.keys(errors).length === 0 && paymentItemsOk) {
      try {
        setIsGeneratingPDF(true);

        const html2canvas = (await import("html2canvas")).default;
        const { default: jsPDF } = await import("jspdf");

        const container = document.createElement("div");
       container.style.cssText =
  "position:fixed;left:-9999px;top:0;width:794px;height:1123px;background:#fff;padding:4px;margin:0;box-sizing:border-box;";
        const { createRoot } = await import("react-dom/client");
        const root = createRoot(container);
        document.body.appendChild(container);

        await new Promise((resolve) => {
          root.render(<ReceiptContent />);
          setTimeout(resolve, 800);
        });

        // Make sure every image (logo) is fully loaded before capturing
        await Promise.all(
          Array.from(container.querySelectorAll("img")).map((img) =>
            img.complete && img.naturalWidth > 0
              ? Promise.resolve()
              : new Promise((resolve) => {
                  img.onload = resolve;
                  img.onerror = resolve;
                  setTimeout(resolve, 4000);
                }),
          ),
        );
        await new Promise((resolve) => setTimeout(resolve, 200));

       const canvas = await html2canvas(container, {
          scale: 4,
          useCORS: true,
          allowTaint: true,
          logging: false,
         backgroundColor: "#ffffff",
         width: 794,
         height: 1123,
          });
        root.unmount();
        document.body.removeChild(container);

        const imgData = canvas.toDataURL("image/jpeg", 0.85);
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        const pdfWidth = 210;
        const pdfHeight = 297;
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);

        const projectPart = (formik.values.projectType || "").replace(
          /[^a-zA-Z0-9]/g,
          "_",
        );
        const seniorityPart = (formik.values.seniorityNumber || "").replace(
          /[^a-zA-Z0-9]/g,
          "_",
        );
        const receiptPart = (formik.values.receiptNo || "draft").replace(
          /[^a-zA-Z0-9]/g,
          "_",
        );
        const filename = `${projectPart}_${seniorityPart}.pdf`;
        const pdfBase64 = pdf.output("datauristring").split(",")[1];

        // Download the PDF immediately — never wait for the server (email/cloud can be slow)
        pdf.save(filename);
        toast.info("📄 Receipt PDF downloaded. Saving & emailing...");

        const checkedBookingAdvances = bookingAdvanceRows.filter(
          (row) => row.checked && parseFloat(row.amount || 0) > 0,
        );
        const paymentTypeStr = [
          ...paymentItems
            .filter((i) => i.checked && parseFloat(i.amount || 0) > 0)
            .map((i) => i.name),
          ...checkedBookingAdvances.map((_, i) =>
            checkedBookingAdvances.length > 1
              ? `Booking Advance ${i + 1}`
              : "Booking Advance",
          ),
        ].join(", ");

        try {
          const receiptPayload = {
            receiptNo: formik.values.receiptNo,
            membershipid: formik.values.seniorityNumber,
            name: formik.values.receivedFrom,
            projectname: formik.values.projectType,
            date: formik.values.receiptDate,
            amountpaid: adjustedTotal,
            mobilenumber: formik.values.phoneNumber,
            email: formik.values.Email,
            paymentmode: formik.values.paymentMode,
            paymenttype: paymentTypeStr,
            transactionid: transactionIds.filter(Boolean).join(", "),
            dimension: formik.values.siteDimension || "N/A",
            bank: selectedBanks
              .map((b) => b.bank)
              .filter(Boolean)
              .join(", "),
            created_by: createdBy,
            pdfBase64,
            pdfFilename: filename,
          };

          const response = await axios.post(
            `${API_BASE}/receipt`,
            receiptPayload,
            { timeout: 90000 },
          );
          if (response.data && response.data.success) {
            toast.success(
              "✅ Receipt generated, downloaded and emailed successfully!",
            );
          } else {
            toast.warning(
              `Receipt downloaded, but server said: ${response.data?.message || "not saved"}`,
            );
          }
        } catch (backendError) {
          console.error("⚠️ Backend error:", backendError);
          const serverMsg =
            backendError?.response?.data?.message || backendError.message;
          toast.warning(
            `Receipt downloaded, but saving/email failed: ${serverMsg}`,
            { autoClose: 9000 },
          );
        }

        setIsGeneratingPDF(false);
      } catch (error) {
        console.error("Error generating receipt:", error);
        toast.error(`Failed to generate receipt: ${error.message}`);
        setIsGeneratingPDF(false);
      }
    } else {
      // Tell the user exactly what is blocking the PDF (previously it failed silently)
      const problems = Object.values(errors).filter(Boolean);
      if (!paymentItemsOk) {
        problems.push("Select at least one payment item with an amount");
      }
      toast.error(
        `❌ Cannot generate receipt. Please fix: ${problems.slice(0, 4).join(" • ")}${
          problems.length > 4 ? ` (+${problems.length - 4} more)` : ""
        }`,
        { autoClose: 8000 },
      );
      const firstKey = Object.keys(errors)[0];
      if (firstKey) {
        const el = document.querySelector(`[name="${firstKey}"]`);
        if (el && el.scrollIntoView) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      setIsGeneratingPDF(false);
    }
  };

  const total = calculateTotal();

  const shouldApplyMembershipFeeAdjustment = () => {
    if (!memberExists || hasExistingReceipt) return false;
    const userSelectedMembershipItems = paymentItems.some(
      (item) => item.checked && MEMBERSHIP_BREAKDOWN[item.name] !== undefined,
    );
    return !userSelectedMembershipItems;
  };

  const getAdjustedBreakdownData = () => {
    const adjustedItems = paymentItems.map((item) => ({ ...item }));
    const adjustedAdvance = bookingAdvanceRows.map((row) => ({ ...row }));

    if (!shouldApplyMembershipFeeAdjustment()) {
      return { adjustedItems, adjustedAdvance };
    }

    let remaining = TOTAL_MEMBERSHIP_FEE;

    for (let i = 0; i < adjustedItems.length; i++) {
      const item = adjustedItems[i];
      if (
        item.checked &&
        !MEMBERSHIP_BREAKDOWN[item.name] &&
        parseFloat(item.amount) > 0 &&
        remaining > 0
      ) {
        const amt = parseFloat(item.amount);
        if (amt >= remaining) {
          adjustedItems[i].amount = amt - remaining;
          remaining = 0;
          break;
        } else {
          adjustedItems[i].amount = 0;
          remaining -= amt;
        }
      }
    }

    if (remaining > 0) {
      for (let i = 0; i < adjustedAdvance.length; i++) {
        if (
          adjustedAdvance[i].checked &&
          parseFloat(adjustedAdvance[i].amount) > 0 &&
          remaining > 0
        ) {
          const amt = parseFloat(adjustedAdvance[i].amount);
          if (amt >= remaining) {
            adjustedAdvance[i].amount = amt - remaining;
            remaining = 0;
            break;
          } else {
            adjustedAdvance[i].amount = 0;
            remaining -= amt;
          }
        }
      }
    }

    if (remaining === 0) {
      Object.keys(MEMBERSHIP_BREAKDOWN).forEach((itemName) => {
        const index = adjustedItems.findIndex((i) => i.name === itemName);
        if (index !== -1) {
          adjustedItems[index] = {
            ...adjustedItems[index],
            checked: true,
            amount: MEMBERSHIP_BREAKDOWN[itemName],
          };
        }
      });
    }

    return { adjustedItems, adjustedAdvance };
  };

  const { adjustedItems, adjustedAdvance } = getAdjustedBreakdownData();

  const getAdjustedTotal = () => {
    const itemsTotal = adjustedItems.reduce((sum, item) => {
      return sum + (item.checked ? parseFloat(item.amount || 0) : 0);
    }, 0);
    const advanceTotal = adjustedAdvance.reduce((sum, row) => {
      return sum + (row.checked ? parseFloat(row.amount || 0) : 0);
    }, 0);
    return itemsTotal + advanceTotal;
  };

  const adjustedTotal = getAdjustedTotal();
  const amountInWords = numberToWords(adjustedTotal);

  const getAllCheckedItems = () => {
    const items = adjustedItems.filter(
      (item) =>
        item.checked &&
        parseFloat(item.amount) > 0 &&
        !MEMBERSHIP_BREAKDOWN[item.name],
    );

    const checkedAdvanceRows = bookingAdvanceRows.filter(
      (row) => row.checked && parseFloat(row.amount) > 0,
    );

    const advanceItems = checkedAdvanceRows.map((row, i) => ({
      name:
        checkedAdvanceRows.length > 1
          ? `Booking Advance ${i + 1}`
          : "Booking Advance",
      amount: adjustedAdvance[i]?.amount ?? row.amount,
      checked: true,
    }));

    return [...items, ...advanceItems];
  };

  const ReceiptContent = () => {
    // The receipt is a fixed A4 page. Header and footer NEVER change size.
    // Only the row spacing inside the two tables shrinks to make everything fit.
    const paymentRowCount = Math.max(1, getAllCheckedItems().length); // top table rows
    const particularsRowCount = adjustedItems.length + bookingAdvanceRows.length; // list rows
    const MIDDLE_SPACE = 735; // px available between header and footer
    const contentAtZeroPad =
      512 + 25 * (paymentRowCount - 1) + 18 * (particularsRowCount - 12);
    const rowPad = Math.max(
      2,
      Math.min(16, Math.floor((MIDDLE_SPACE - contentAtZeroPad) / (particularsRowCount + 1))),
    );
    const padTop = Math.round(rowPad * 0.3);
    const particularsPad = `${padTop}px 8px ${rowPad - padTop}px`;
    return (
    <div
      style={{
        border: "2px solid #000000",
        backgroundColor: "#ffffff",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        boxSizing: "border-box",
        height: "1115px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header with Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: "132px",
          flexShrink: 0,
          boxSizing: "content-box",
          borderBottom: "2px solid #000000",
          paddingBottom: "15px",
          paddingTop: "18px", // equal space above the logo and below the website line
          marginTop: "0px",
          marginBottom: "16px",
          marginLeft: "-20px",
          marginRight: "-20px",
          paddingLeft: "10px",
          paddingRight: "0px",
          gap: "10px",
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <img
            src={LOGO_BASE64}
            alt="Logo"
            style={{
              width: "148px",
              height: "120px",
              marginBottom: "20px",
              display: "block",
            }}
          />
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              marginBottom: "4px",
            }}
          >
            {formik.values.societyNameKannada}
          </div>
          <div
            style={{
              fontSize: "15px",
              fontWeight: "bold",
              marginBottom: "4px",
            }}
          >
            {formik.values.societyName}
          </div>
          <div style={{ fontSize: "11px", marginBottom: "2px" }}>
            {formik.values.societyAddress}
          </div>
          <div style={{ fontSize: "11px", marginBottom: "2px" }}>
            {formik.values.regNo}
          </div>
          <div style={{ fontSize: "11px" }}>
            <a
              href={`https://${formik.values.website}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#000000",
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              {formik.values.website}
            </a>
            {" / "}
            <a
              href={`mailto:${formik.values.email}`}
              style={{
                color: "#000000",
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              {formik.values.email}
            </a>
          </div>
        </div>
        <div style={{ width: "80px", flexShrink: 0 }}></div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
      {/* RECEIPT Label */}
      <div style={{ textAlign: "center", paddingBottom: "6px" }}>
        <span
          style={{
            border: "2px solid #000000",
            fontWeight: "bold",
            fontSize: "14px",
            paddingLeft: "10px",
            paddingRight: "10px",
            paddingTop: "5px",
            paddingBottom: "18px",
          }}
        >
          RECEIPT
        </span>
      </div>

      {/* Receipt Number and Date */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "16px",
          fontSize: "13px",
          fontWeight: "bold",
        }}
      >
        <div>RECEIPT No. {formik.values.receiptNo}</div>
        <div>Date: {formatDate(formik.values.receiptDate)}</div>
      </div>

      {/* Received From Section */}
      <div style={{ fontSize: "13px", marginBottom: "16px" }}>
        <div
          style={{
            marginBottom: "6px",
            paddingBottom: "6px",
          }}
        >
          <strong>
            Received From Smt./Shree: {formik.values.receivedFrom}
          </strong>
        </div>
        <div
          style={{
            marginBottom: "6px",
            paddingBottom: "6px",
          }}
        >
          <strong>Address: {formik.values.flatNumber}</strong>
        </div>
        <div
          style={{
            marginBottom: "6px",
            paddingBottom: "6px",
          }}
        >
          <strong>Rupees: {amountInWords} Only.</strong>
        </div>
        <div style={{ paddingBottom: "6px" }}>
          <strong>
            Seniority Number: {formik.values.projectType} (
            {formik.values.seniorityNumber})
          </strong>
        </div>
      </div>

      {/* Table 1: Payment Details */}
      <div style={{ marginBottom: "16px" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            border: "1px solid #000000",
            fontSize: "12px",
          }}
        >
          <thead>
            <tr>
              {[
                "S.No",
                "Dimension",
                "Payment Type",
                "Payment Mode",
                "Bank",
                "Branch",
                "Cheque/Transaction ID",
                "Amount",
              ].map((header, i) => (
                <th
                  key={i}
                  style={{
                    border: "1px solid #000000",
                    padding: "3px 6px 9px",
                    textAlign: "center",
                    fontWeight: "bold",
                    fontSize: "12px",
                    backgroundColor: "#f0f0f0",
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {getAllCheckedItems().map((item, index) => {
              const bank = selectedBanks[index];
              const transactionId = transactionIds[index];
              return (
                <tr key={index}>
                  <td
                    style={{
                      border: "1px solid #000000",
                      padding: "3px 6px 9px",
                      textAlign: "center",
                      fontSize: "11px",
                    }}
                  >
                    {index + 1}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000000",
                      padding: "3px 6px 9px",
                      textAlign: "center",
                      fontSize: "11px",
                    }}
                  >
                    {formik.values.siteDimension}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000000",
                      padding: "3px 6px 9px",
                      textAlign: "center",
                      fontSize: "11px",
                    }}
                  >
                    {item.name}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000000",
                      padding: "3px 6px 9px",
                      textAlign: "center",
                      fontSize: "11px",
                    }}
                  >
                    {formik.values.paymentMode}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000000",
                      padding: "3px 6px 9px",
                      textAlign: "center",
                      fontSize: "11px",
                    }}
                  >
                     {formik.values.paymentMode === "Cash" ? "" : bank?.bank || selectedBanks[0]?.bank || ""}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000000",
                      padding: "3px 6px 9px",
                      textAlign: "center",
                      fontSize: "11px",
                    }}
                  >
                     {formik.values.paymentMode === "Cash" ? "" : bank?.branch || selectedBanks[0]?.branch || ""}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000000",
                      padding: "3px 6px 9px",
                      textAlign: "center",
                      fontSize: "11px",
                    }}
                  >
 {formik.values.paymentMode === "Cash" ? "" : transactionId || transactionIds[0] || ""}
                  </td>
                  <td
                    style={{
                      border: "1px solid #000000",
                      padding: "3px 6px 9px",
                      textAlign: "right",
                      fontSize: "11px",
                    }}
                  >
                    {item.amount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table 2: Particulars Breakdown */}
      <div style={{ marginBottom: "16px" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            border: "1px solid #000000",
            fontSize: "12px",
          }}
        >
          <thead>
            <tr>
              <th
                colSpan="2"
                style={{
                  border: "1px solid #000000",
                  padding: particularsPad,
                  textAlign: "center",
                  fontWeight: "bold",
                  width: "70%",
                  backgroundColor: "#f0f0f0",
                }}
              >
                Particulars
              </th>
              <th
                style={{
                  border: "1px solid #000000",
                  padding: particularsPad,
                  textAlign: "center",
                  fontWeight: "bold",
                  width: "5%",
                  backgroundColor: "#f0f0f0",
                }}
              >
                L.F
              </th>
              <th
                style={{
                  border: "1px solid #000000",
                  padding: particularsPad,
                  textAlign: "center",
                  fontWeight: "bold",
                  width: "20%",
                  backgroundColor: "#f0f0f0",
                }}
              >
                Rs.
              </th>
              <th
                style={{
                  border: "1px solid #000000",
                  padding: particularsPad,
                  textAlign: "center",
                  fontWeight: "bold",
                  width: "5%",
                  backgroundColor: "#f0f0f0",
                }}
              >
                P
              </th>
            </tr>
          </thead>
          <tbody>
            {adjustedItems.map((item, index) => {
              const hasAmount = item.checked && parseFloat(item.amount) > 0;
              return (
                <tr key={index}>
                  <td
                    style={{
                      borderLeft: "1px solid #000",
                      padding: particularsPad,
                      textAlign: "center",
                      width: "5%",
                    }}
                  >
                    {index + 1}.
                  </td>
                  <td style={{ padding: particularsPad }}>
                    {item.name}
                  </td>
                  <td style={{ borderLeft: "1px solid #000",
                      borderRight: "1px solid #000", padding: particularsPad }}></td>
                  <td
                    style={{
                      borderLeft: "1px solid #000",
                      borderRight: "1px solid #000",
                      padding: particularsPad,
                      textAlign: "right",
                    }}
                  >
                    {hasAmount ? item.amount : "-"}
                  </td>
                  <td style={{ borderLeft: "1px solid #000",
                      borderRight: "1px solid #000", padding: particularsPad }}></td>
                </tr>
              );
            })}

            {bookingAdvanceRows.map((row, index) => {
              const hasAmount = row.checked && parseFloat(row.amount) > 0;
              const displayAmount = hasAmount
                ? (adjustedAdvance[index]?.amount ?? row.amount)
                : null;
              return (
                <tr key={`ba-${index}`}>
                  <td
                    style={{
                      borderLeft: "1px solid #000",
                      padding: particularsPad,
                      textAlign: "center",
                    }}
                  >
                    {adjustedItems.length + index + 1}.
                  </td>
                  <td style={{ padding: particularsPad }}>
                    {bookingAdvanceRows.length > 1
                      ? `Booking Advance ${index + 1}`
                      : "Booking Advance"}
                  </td>
                  <td style={{ borderLeft: "1px solid #000",
                      borderRight: "1px solid #000", padding: particularsPad }}></td>
                  <td
                    style={{
                      borderLeft: "1px solid #000",
                      borderRight: "1px solid #000",
                      padding: particularsPad,
                      textAlign: "right",
                    }}
                  >
                    {displayAmount !== null && parseFloat(displayAmount) > 0
                      ? displayAmount
                      : "-"}
                  </td>
                  <td style={{ borderLeft: "1px solid #000",
                      borderRight: "1px solid #000", padding: particularsPad }}></td>
                </tr>
              );
            })}

            {/* Total Row */}
            <tr style={{ fontWeight: "bold" }}>
              <td
                colSpan="2"
                style={{ border: "1px solid #000000", padding: particularsPad }}
              >
                <strong>Total</strong>
              </td>
              <td style={{ border: "1px solid #000000", padding: particularsPad }}></td>
              <td
                style={{
                  border: "1px solid #000000",
                  padding: particularsPad,
                  textAlign: "center",
                }}
              >
                <strong>{adjustedTotal}</strong>
              </td>
              <td style={{ border: "1px solid #000000", padding: particularsPad }}></td>
            </tr>
          </tbody>
        </table>
      </div>

      </div>

      {/* Footer (fixed at bottom) */}
      <div style={{ flexShrink: 0 }}>
      {/* Note */}
      <div
        style={{ fontSize: "11px", fontStyle: "italic", marginBottom: "32px" }}
      >
        *If 30% of the booking amount is not paid within 20 days from the date
        of booking, 10% penalty apply.
      </div>

      {/* Signatures */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "13px",
          marginTop: "56px",
          marginBottom: "12px",
          paddingBottom: "12px",
        }}
      >
        <div>Party's Signature</div>
        <div>President/Secretary</div>
      </div>
      </div>
    </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <style>{`
 @media print {
  body { background: white !important; margin: 0 !important; padding: 0 !important; }
  html, body { height: 100%; overflow: visible; }
  .no-print { display: none !important; }
  .print-container { display: block !important; position: relative !important; left: 0 !important; visibility: visible !important; }
 .a4-receipt { 
  box-shadow: none !important; 
  margin: 0 !important; 
  width: 210mm !important; 
  min-height: 297mm !important; 
  padding: 6px 6px!important;
  page-break-after: avoid !important; 
  display: block !important; 
  visibility: visible !important; 
}
  @page { size: A4 portrait; margin: 0; }
}

body { background: white !important; }
.a4-receipt { 
  width: 206mm; 
  min-height: 297mm; 
  padding: 6px 6px;
  background: white; 
  margin: 2mm auto; 
  box-sizing: border-box; 
}
.receipt-panel { font-family: Arial, sans-serif; }
`}</style>

      <div>
        <Header />
      </div>

      <div className="max-w-4xl px-[50px] p-6">
        <h2 className="text-[24px] font-semibold text-gray-800 mb-4 mt-2">
          Receipt Form
        </h2>
        <form onSubmit={formik.handleSubmit}>
          <div className="no-print bg-[#FAF9FF] rounded-lg shadow-sm p-5">
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Receipt Number */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Receipt Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="receiptNo"
                    value={formik.values.receiptNo}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder="e.g., RCP/2024/001"
                    className={`w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 ${
                      formik.touched.receiptNo && formik.errors.receiptNo
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-purple-500"
                    }`}
                  />
                  {formik.touched.receiptNo && formik.errors.receiptNo && (
                    <p className="text-red-500 text-xs mt-0.5">
                      {formik.errors.receiptNo}
                    </p>
                  )}
                </div>

                {/* Project Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="projectType"
                    value={formik.values.projectType}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    {PROJECT_TYPES.map((project) => (
                      <option key={project.name} value={project.name}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Seniority Number */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Seniority Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1.5 text-sm font-semibold bg-purple-100 text-purple-700 border border-purple-300 rounded-md whitespace-nowrap">
                      {PROJECT_TYPES.find(
                        (p) => p.name === formik.values.projectType,
                      )?.code || "---"}
                    </span>
                    <input
                      type="text"
                      value={seniorityInput}
                      onChange={handleSeniorityInputChange}
                      placeholder="001"
                      maxLength={3}
                      className={`w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 ${
                        formik.touched.seniorityNumber &&
                        formik.errors.seniorityNumber
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:ring-purple-500"
                      }`}
                    />
                  </div>
                  {formik.values.seniorityNumber && (
                    <p className="text-xs text-blue-600 font-semibold mt-1">
                      Generated: {formik.values.seniorityNumber}
                    </p>
                  )}
                  {isCheckingMember && (
                    <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-xs text-blue-800">
                        🔍 Checking member...
                      </p>
                    </div>
                  )}
                  {memberValidationMessage && !isCheckingMember && (
                    <div
                      className={`mt-1 p-2 border rounded-md ${
                        memberExists
                          ? hasExistingReceipt
                            ? "bg-green-50 border-green-200"
                            : "bg-yellow-50 border-yellow-200"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <p
                        className={`text-xs font-semibold ${
                          memberExists
                            ? hasExistingReceipt
                              ? "text-green-800"
                              : "text-yellow-800"
                            : "text-red-800"
                        }`}
                      >
                        {memberValidationMessage}
                      </p>
                    </div>
                  )}
                  {formik.touched.seniorityNumber &&
                    formik.errors.seniorityNumber && (
                      <p className="text-red-500 text-xs mt-0.5">
                        {formik.errors.seniorityNumber}
                      </p>
                    )}
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="receivedFrom"
                    value={formik.values.receivedFrom}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder="Auto-filled from database"
                    className={`w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 ${
                      formik.touched.receivedFrom && formik.errors.receivedFrom
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-purple-500"
                    }`}
                  />
                  {formik.touched.receivedFrom &&
                    formik.errors.receivedFrom && (
                      <p className="text-red-500 text-xs mt-0.5">
                        {formik.errors.receivedFrom}
                      </p>
                    )}
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Payment Mode <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="paymentMode"
                    value={formik.values.paymentMode}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    {paymentModes.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Transaction IDs */}
                
                 {formik.values.paymentMode !== "Cash" && (
                 <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Transaction ID <span className="text-red-500">*</span>
                    <span className="text-gray-400 ml-1">(max 3)</span>
                  </label>
                  {transactionIds.map((tid, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={tid}
                        onChange={(e) =>
                          updateTransactionId(index, e.target.value)
                        }
                        placeholder={`Transaction ID ${index + 1}`}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      {transactionIds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTransactionId(index)}
                          className="px-3 py-1.5 text-sm bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {transactionIds.length < 3 && (
                    <button
                      type="button"
                      onClick={addTransactionId}
                      className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                    >
                      + Add Transaction ID
                    </button>
                  )}
              </div>
                 )}

                {/* Paid Amount */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Paid Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={`₹${total.toLocaleString()}`}
                    readOnly
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-50 focus:outline-none"
                  />
                </div>

                {/* Site Dimension */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Site Dimension
                  </label>
                  <input
                    type="text"
                    name="siteDimension"
                    value={formik.values.siteDimension}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder="e.g., 30x40"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-filled from Site Booking if available
                  </p>
                </div>

                {/* Bank & Branch */}
                {formik.values.paymentMode !== "Cash" && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Bank & Branch <span className="text-red-500">*</span>
                      <span className="text-gray-400 ml-1">(max 3)</span>
                    </label>
                    {selectedBanks.map((bankEntry, index) => (
                      <div key={index} className="flex gap-2 mb-2 items-start">
                        <div className="flex-1">
                          <select
                            value={bankEntry.bank}
                            onChange={(e) =>
                              updateBankField(index, "bank", e.target.value)
                            }
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                          >
                            <option value="">Select Bank</option>
                            {banks.map((bank) => (
                              <option key={bank} value={bank}>
                                {bank}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={bankEntry.branch}
                            onChange={(e) =>
                              updateBankField(index, "branch", e.target.value)
                            }
                            placeholder="Enter branch name"
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                        {selectedBanks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeBank(index)}
                            className="px-3 py-1.5 text-sm bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    {selectedBanks.length < 3 && (
                      <button
                        type="button"
                        onClick={addBank}
                        className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                      >
                        + Add Bank
                      </button>
                    )}
                  </div>
                )}

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="phoneNumber"
                    value={formik.values.phoneNumber}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    placeholder="Auto-filled from database"
                    className={`w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 ${
                      formik.touched.phoneNumber && formik.errors.phoneNumber
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-purple-500"
                    }`}
                  />
                  {formik.touched.phoneNumber && formik.errors.phoneNumber && (
                    <p className="text-red-500 text-xs mt-0.5">
                      {formik.errors.phoneNumber}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="Email"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.Email}
                    placeholder="Auto-filled from database"
                    className={`w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 ${
                      formik.touched.Email && formik.errors.Email
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-purple-500"
                    }`}
                  />
                  {formik.touched.Email && formik.errors.Email && (
                    <div className="text-red-500 text-xs mt-1">
                      {formik.errors.Email}
                    </div>
                  )}
                </div>

                {/* Receipt Date */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Receipt Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="receiptDate"
                    value={formik.values.receiptDate}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    max={new Date().toISOString().split("T")[0]}
                    className={`w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 ${
                      formik.touched.receiptDate && formik.errors.receiptDate
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-purple-500"
                    }`}
                  />
                  {formik.touched.receiptDate && formik.errors.receiptDate && (
                    <p className="text-red-500 text-xs mt-0.5">
                      {formik.errors.receiptDate}
                    </p>
                  )}
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Address <span className="text-red-500">*</span>
                  </label>
                  {memberAddresses.length > 0 && (
                    <select
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white mb-2"
                      value={formik.values.flatNumber}
                      onChange={(e) =>
                        formik.setFieldValue("flatNumber", e.target.value)
                      }
                    >
                      <option value="" disabled>
                        — Select a saved address —
                      </option>
                      {memberAddresses.map((addr, idx) => (
                        <option key={idx} value={addr.value}>
                          {addr.label}: {addr.value}
                        </option>
                      ))}
                    </select>
                  )}
                  <textarea
                    name="flatNumber"
                    value={formik.values.flatNumber}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    rows="2"
                    placeholder="Complete address with pincode"
                    className={`w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 ${
                      formik.touched.flatNumber && formik.errors.flatNumber
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-purple-500"
                    }`}
                  />
                  {memberAddresses.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Select from dropdown or type a custom address above
                    </p>
                  )}
                  {formik.touched.flatNumber && formik.errors.flatNumber && (
                    <p className="text-red-500 text-xs mt-0.5">
                      {formik.errors.flatNumber}
                    </p>
                  )}
                </div>
              </div>

              {/* Payment Items */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">
                  Payment Items <span className="text-red-500">*</span>
                </h3>

                {paymentItemsError && (
                  <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600 text-xs font-semibold">
                      {paymentItemsError}
                    </p>
                  </div>
                )}

                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2 mb-3">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {paymentItems.map((item, index) => {
                      const isMembershipItem =
                        MEMBERSHIP_BREAKDOWN[item.name] !== undefined;
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-1.5 bg-gray-50 rounded hover:bg-gray-100 transition"
                        >
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={(e) =>
                              handlePaymentItemChange(
                                index,
                                "checked",
                                e.target.checked,
                              )
                            }
                            className="w-3.5 h-3.5 cursor-pointer flex-shrink-0"
                          />
                          <label className="flex-1 text-xs font-medium text-gray-700 min-w-0">
                            {item.name}
                            {isMembershipItem && (
                              <span className="ml-1 text-xs text-blue-600">
                                (₹{MEMBERSHIP_BREAKDOWN[item.name]})
                              </span>
                            )}
                          </label>
                          <input
                            type="number"
                            value={item.amount || ""}
                            onChange={(e) =>
                              handlePaymentItemChange(
                                index,
                                "amount",
                                e.target.value,
                              )
                            }
                            disabled={isMembershipItem}
                            placeholder="₹"
                            min="0"
                            max="100000000"
                            className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:border-purple-500 focus:outline-none disabled:bg-gray-100 flex-shrink-0"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Booking Advance rows */}
                <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-semibold text-gray-700">
                      Booking Advance
                      <span className="text-gray-400 ml-1">(max 3)</span>
                    </h4>
                    {bookingAdvanceRows.length < 3 && (
                      <button
                        type="button"
                        onClick={addBookingAdvanceRow}
                        className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                      >
                        + Add Row
                      </button>
                    )}
                  </div>

                  {bookingAdvanceRows.map((row, index) => (
                    <div key={index} className="flex gap-2 mb-2 items-center">
                      <input
                        type="checkbox"
                        checked={row.checked}
                        onChange={(e) =>
                          updateBookingAdvanceRow(
                            index,
                            "checked",
                            e.target.checked,
                          )
                        }
                        className="w-3.5 h-3.5 cursor-pointer flex-shrink-0"
                      />
                      <label className="text-xs text-gray-600 w-32 flex-shrink-0">
                        {bookingAdvanceRows.length > 1
                          ? `Booking Advance ${index + 1}`
                          : "Booking Advance"}
                      </label>
                      <input
                        type="number"
                        value={row.amount || ""}
                        onChange={(e) =>
                          updateBookingAdvanceRow(
                            index,
                            "amount",
                            e.target.value,
                          )
                        }
                        disabled={!row.checked}
                        placeholder="₹ Amount"
                        min="0"
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:border-purple-500 focus:outline-none disabled:bg-gray-100"
                      />
                      {bookingAdvanceRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBookingAdvanceRow(index)}
                          className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div
                className={`border rounded-md p-3 ${
                  total > 0
                    ? "bg-green-50 border-green-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div
                  className={`text-sm font-semibold ${total > 0 ? "text-green-800" : "text-gray-600"}`}
                >
                  Total Amount: ₹{total.toLocaleString("en-IN")}
                </div>
                <div
                  className={`text-xs mt-0.5 ${total > 0 ? "text-green-600" : "text-gray-500"}`}
                >
                  {total > 0
                    ? `${amountInWords} Rupees Only`
                    : "No amount selected"}
                </div>
              </div>

              {/* Created By */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Created By <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={createdBy}
                    onChange={(e) => setCreatedBy(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    {ADMIN_NAMES.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={createdBy}
                    onChange={(e) => setCreatedBy(e.target.value)}
                    placeholder="Or type name"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="px-8 py-2 border-2 border-purple-500 text-purple-600 text-sm font-semibold rounded-full hover:bg-purple-50 transition-all duration-200"
                >
                  👁 Preview
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF || !memberExists}
                  className={`px-10 py-2 bg-gradient-to-r from-yellow-400 via-purple-500 to-purple-600 text-white text-sm font-semibold rounded-full shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 ${
                    isGeneratingPDF || !memberExists
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  {isGeneratingPDF ? "Generating..." : "GENERATE RECEIPT"}
                </button>
              </div>
            </div>
          </div>
        </form>

        <div style={{ display: "none" }}>
          <div ref={receiptRef} />
        </div>

        {/* Preview Modal */}
        {showPreviewModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPreviewModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-[950px] max-h-[95vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-800">
                    Receipt Preview
                  </span>
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                    Preview Only
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPreviewModal(false);
                      handleDownloadPDF();
                    }}
                    disabled={isGeneratingPDF || !memberExists}
                    className={`px-6 py-2 bg-gradient-to-r from-yellow-400 via-purple-500 to-purple-600 text-white text-sm font-semibold rounded-full hover:opacity-90 transition ${
                      isGeneratingPDF || !memberExists
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {isGeneratingPDF ? "Generating..." : "Generate PDF"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-lg font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 p-6 bg-gray-100">
                <div
                  style={{
                    width: "210mm",
                    minHeight: "297mm",
                    margin: "0 auto",
                    backgroundColor: "#ffffff",
                    padding: "6px 6px",
                    boxSizing: "border-box",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  }}
                >
                  <ReceiptContent />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptForm;

// Society logo embedded so it can never fail to load in the receipt PDF
const LOGO_BASE64 =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAQDAwMDAgQDAwMEBAQFBgoGBgUFBgwICQcKDgwPDg4MDQ0PERYTDxAVEQ0NExoTFRcYGRkZDxIbHRsYHRYYGRj/2wBDAQQEBAYFBgsGBgsYEA0QGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBj/wAARCAHmAlgDASIAAhEBAxEB/8QAHQABAAIDAQEBAQAAAAAAAAAAAAcIBQYJBAMCAf/EAGEQAAEDAwIEAwMHBwcGCgcECwECAwQABQYHEQgSITETQVEiYXEUFTJCUoGRIzNicoKSoQkWJEOiscEXU2Oys8MYJTQ2VHN0k8LRNTdEg6PS8CYnOGV10+EoRWRVhKS08f/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwC/1KUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUJ2oFKirUjiL0l0uU5GyPKWHbkjf8A4st4+UydwdtilPRJ/WIqrt04q9Xdcs/i6e6KWcY0maop+WukPSkNjbmdWvbkaQkdTsCeu3egvoHmi+WA4jxAOYo5hzbeu1fuo60m0otemOOKS5cZd9yGYAu5X64uKdkSl+gKiShsfVQDsPjUi0ClKUClKUClKUClKwOUZrieF2pVxyrIbfaIwSVc8t4IKgPsp7q+4Ggz1KqrmvHLgNoW7FwyyXHI3xuEyF/0WPv5EFXtKHwFQPfeLHXjPZ67diyk2nnPsxbBCU++nf1WQpX38ooOjkmZFhtF2XJZYbHdbqwgfiaj6/6+6N4ypbd21EsaXkfSZjyBIcH7Le5qikbQLiR1NdEy/wBvuqm3DzeNklwKU/EIUVbfDlFSFYuBC/uchyTPrdEQR7TVuiKdUn3cyiEn8KCZLvxs6K28qEBy/wB3I7fJbeWwf+9KK06fx84ogn5r09vb/p8qlNM/6vPWRtPA7pfEQPne+5Jc1DvyvIjA/ug1t8DhL0JgpAXh65pHnMmOub/gRQRDI4/5O/8ARtLWgP8AS3g/4M15f+H/AHjf/wBWdv29PnVf/wCqqwjHDjodG/M6aWMfrJcV/euvZ/kF0a5eX/Jtj+3/AFB/86CvMfj/AJJI+VaXNEf6K7n/ABZrPQOPnFVkfOmnt7YHmYspp7b97kqXJHDjodJ/PaaWM/qpcT/cusHP4S9CZySEYeuET5w5jre34k0GPtPG1otcCBPVf7ST/wBKt5cA/wC6K6kWw6/aNZItDdq1FsZeX9FmQ+I7h/Zc2NQ3duB7S6Wk/NN7yS2KPbd9EkD94Co8v3AhfmwpWNZ/b5aQOjVyiKaUr3cyCUj8KC9MaZEmNB2JJZkNnqFtLCwfvFfauZsrQDiQ0zeMvH7fdA22SrxsbuBUn4lCSnf4cpr32Liw15wK4It2UKF15D7UXIISmHz+2AlX8DQdI6VVTCuObArstuLmljuOOPnYKkN7So+/md07KSPiKsbi+a4nmtqTcsUyG33eMQFFcR4LKQftJ7p+8Cgz1KUoFKUoFKUoFKU3oPgmbDXOchIlMqktgKWyFgrSD2JT3ANfeoh1l0KtWp/hX+0XeZi+aQmvDhX+3OKbc5Qdw09ykFbe5PTuNyR6VVJvih1+0Jzx7B9VrdGyT5IRuqUPCedaJ6OtPoGy0kDpun3HrQdC6VBelvFjpNqc4zbk3VWP3pzoLbdylorPo25vyL/EHr0FTmCD2oP7SlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlCQKBSvimXGXJVHRIaU8kblsLBUPiO9RLr5r7juiGGiTISi4ZBMSpNutSV7Fwju459lseZ8+woNv1H1RwnSnFFX/NLw3CZO6WGEjnfkr+w02Oqj/AdyQK56aycY2oeosiRasVeexLHVboDURz+lyE9vyro7Aj6qNh5Eq71C2fag5ZqZmkjKMxurk+c8SEg9G2Eb9G2kdkIHoPidzua1ig+8ePMuNzaixGXpUyU6ltttAK3HnFHYAeZJJ2rqJwz6GQdGtPEyLmy07l10bS5cpPRXgDuIyD9lP1iPpK3PUAVBnB9oeiA0zq3lkP8ApTg/4jiujq2g9DJIPmeyPQbq8xtc9h8rNBnEOb16EnpXgj7navckbCg/VKUoFKVgstzLGMGxt6/ZXeYtrgNDq6+vbmP2UjupXuG5oM7Wg6jaz6c6WQvEy7IWWZSk8zVujjxpLv6rY6gfpK2T76qNq1xo5Lkcl6waVRHrPAcJaFzdb55r+/T8mjqG9/LoVfCtc034T9R9SZYyXPJ0nH4EpXiren7vT5W/Xm5FHcb/AGlmgy2o/GvneTyHLTp1bE45DcPIiQoCRNdB6dOnKjf0SCR9qtYxnhs101buqb/lapNuakHnVcsjeUp9YPmlo7rJ+ISD61dbTnQ7TfS9hKsZsDZnge1c5mz8pR9yyPZ/ZA++pBekMRmfGkvtMt77eI6sITv6bnpvQV1wjgx0uxxLcjJ3p2VzE9SJKvAjb+5pB3I9ylKqebFjOOYvATBxuw220R0/Ragx0tAfgKygIUkEEEEbgjzqpHG5q7qTphExWNguRLssa6okCU6yyhTqigp22WoHlGxPYb++gtyQQrdQO/vr+VRXgo16yG4agXfS7UO+XC4zbipU22ybm+p11L6U/lWN1HcAoHOlPYFK/UVeqg8d3nKtmPz7khgyFRYzj4ZCuXxChBVy77HbfbbfY96rBoZxjvaza2MYM5gjVjafivyEP/OBkL3bRzcu3hpHUA9atO+wmTFdjK+i6gtnf3jb/GuP2g2oVq0d4koGY3+JMlQbemZHeZhgFxRcaW2NgSB3INBbrXXi+z7S3iLmafWrG8betkZcY/K5iH1PKbcAKj7LiU7gE7dKt5c7xbrLjErILtJRFt8OKqZJfV2bbSjmUo/Ab1yL4jNUrLq7rnNznHrfOt8V2EwwGpvL4nO0ggq9kkbHpXQPifyByNwCX65xnCFT7fBjbj6yX3GkKH7qlUFdss/lBs3lZS+3p/hFmbtDaj4JuiHn5DqAfpqDa0hG468oB29TUz8OPGBB1iyhOE5XZI9iyV1tbkRcRxSo0zlHMpCQolSFhIJ2JUCEnqO1RR/J1WSM/kGcZC6wlTzTUWEhwp35UrUVqAPv26+tQfpCpDP8oLYvmwBpoZY4ltLfQBBdWCB7ttxQdPtR9Q8d0s07mZplS5KbZFW22v5M34jhU4oJSEp3G/U+tYzTTWfTvVy1zp+DXtc1u38vywPRXY5YKgSAfESAegPYkVXv+UJycwNGsaxRp7lXdboZLqAfpNsoJH9tSa1PQJQ04/k0NQ89Urw5F1+VhlfYj2REbIP6yuYUF4rbdrVeIaJtoucOewvql6I+l1J+BSTXnvuNY7lEBUHJLDbbvGV9JqdHS6D+Irnt/J6489N1uyLIVc4j2y0+F7JISXnnABzDz9hLlWz154lMP0Jjw4dxhSbzfZyC7HtkVYRytg7eI4s9Ep36DzPlQa5m3BjpbkaXJGMuTsVmK3IEVXjx9/e0s9B7kqTVccn4atc9Jrqb/ia5NyajnnRcsceUh9HvU0Nl7/AKA9anHS7jq08zjJY2P5RZ5WJy5TgaYlPPJfiKWTsEqWNi2T6qG3arVUFCtOONfPMXkItOotsTkcNs8i5CQI81rbp16cq9tuygCftVcbTnWnTnVSHz4jkLL0tKeZ23SB4Mpr4tnuP0k7j31idRtDtN9UWVLyewNieRsm5wz4EpP7YHtftA/dVO9SOE7UbTeb/OXAZ0nIIMVfjNuwd2Z8XbrzcqTudvtIP3UHRmlUH0m40cmxuSzYNVYr15gNq8JVyab5Jsfb/OI6Bzbz6BXxq7WJZnjGdY21fcUvUW6QXR0dYXvyn7Kh3Sr3HrQZ6lKUCvws7V+6+axQfBxzl86hviB0UsmtWnq4SktRcigpU5ariR1QvuWlnzbV2PodiO2xl2SCAaxT7ykKO1BxpvdkuuN5HNsF9guwrlBeUxIjujZTa0nr/5gj3EVN2jvFpqTpY7HtlwlLyfHEbJNuuDpLjKP9C8dynYdkndPu86n/i30SRmuNr1GxiFzZFbGf6cy0n2p0ZI77Du42Oo8ynceQqgdB2J0o1qwLWPHTccRugMppIMq2SdkSYpP2kb9R6KTuk+vlUh1xKxnKL/AIblMTI8Yusm2XOIrnakx1bEeoI7KSfNJ3B866Y8NvEzatZrP8x3xLFtzGI1zPxUHZuYgd3md/7SO6feKCwlK19WdYUl9bKsusIcQopWg3BkKSR3BBVuCPSs3Hkx5cVuTFfbeZcSFIcbUFJUD2II6EUH1pSlApSlApSlApSlApSlApSlApSlApSlApSlApSlApSlApSlApStezbNcd0+weflmUz0QrbCb53FnqpZPRKEJ+spR2AA7mg+ed57i2m+Ey8qy65twbfGT3PVbq/JttPdaz5AfwHWuduovExrBrrmzWIaft3Gz26a74ES0WpW0qVv5vOj3dSAQlIG5PQmo51u1uyfWvO13e8OriWiOpSbdakr3biN/aPkpwj6SvuHQVdjhB0ktmA6QQ80uUBH857+z8oU+6n240VX5tpO/wBHcAKV5kkb9ANg/un2EWLhM0BvOomeXBV1yh9kGU4XlObrUR4cNkqJ33XturzPXsBXPzPs7yHUnUG4Zhk8syJ8xe/KD7DLY+i0geSEjoPx7mrC8b2qb+Taqx9PIEkm14+kOSEpPRyY4nck+vIhSQPepdVVoFTXw56Mr1Pzj50vTKk4vanErlqI2EtzumOn3Huo+SennUcYHhN51CzyDi1kb/LyVbuPKHsR2x9NxXuA/E7Dzro3YYeD6Qad2yyLuUKz2qOUsNuy3A2qS8ogFXqtxaiO2/kPIUEjQwEoQ00hKG0AIShA2SkAbAAeQArYYLRIBNYy2xSpIOx2PWtmiR+VI6UHpYb2T2r0gbV/Ep2FfqgUr8rcQ02pxxQSlI3KlHYAetUv4huLzwVS8J0mmguDdmZkDR35fIojH19XP3fUBLWufE9imkrbtktiWr7lRT0gNubNxdx0U+sdvXkHtH3d6pvaMe1o4p9Ql3GXJelx2l8rk+Tu3Bt6T9RtI6b7H6Kd1HfqQDvW9aGcKV4zl5nM9TzLg2Z8/KG4K1kS7hud+ZxR6toPqfaVv0271eizWW049Y49msVti263xk8jMWK2EIQPcB/f3PnQRZpHw4YFpQy1OajJveQhPt3ea2CUHz8FHUNj8T6mphqA+J/iGnaD4xbBaMaNzut4DqYsuSdokZSNt+cA8y1e1uEjbcA9RtUWcL3GE/l96/mHq3cWEXmW+TbLuW0stvlR3+TuAbJSodkHoCOh69SG+8Wmved6JWOzJxHHYLyLuHWxeZhLiYzqdjyBroCopPMCokEA9OlU1l4hxA656TXrWe45Sq/Wy1qd8aKq4qS8gN+054cdI5UpSDzbEjoCRvXQbiO0yTqvw733G2WUrukdHy+2FXdMloEgb+XMOZB9yq5l6a6xaiaeYplGB4eylwZQgRHY7jBddaWQptRaR/nFJJQdwdtu29BaXgD1byC9TL5pbfbhJuEWHDF0tjkhwrVHQHEtuNAnrykuIUB5e161kP5RWGhzA8FlkdRcZLBPuLIP+FVp0a1Oyvhe1gkOZBg5bclstx7jEubC2ZbcYqC92VE7DfYK6ghXKB0qz/HfNtuT8MmGZXZ5KZMB66okxn09ltusHlPu6Ht5HpQVu1Tx67YTaNJteMVcVFXerTEkuSGezVzjpSFk/rgJV17nnrpRpNqNa9V9ILLnFr5GxOZHyiOlW5jPp6ONH4K3237gpPnXNvS/hu1T1u0kXk1tymGbLbA+xBt82W66sutgnwm2xuloKO3U7DrvUjcBmol8x/Ui46bToNwdst3KnmlhhakQpiBseY7bJC0jlO/1kp3oOig+kD765B4ziFkvfHGzguSxFu2qVlj1tksNuqaJSX1p2CkncdQOxrr2PWqWI4Oc+Rxcv6ss5TjjFt/nS5fWop8cveGqQp0IOyOUK2O3faggLjD0ow/SjVax2jCbUq3W6daPlCmlPLdJcDhQTzKJNWT4gpT91/ksrBc2t1IegWV50j7KlNbb/tFNbnxGcL7uvWY2G9NZeixJtkRyKtBiF9TgU5zgj2gBtUkW7Sazf8GqFo1kshV5tbNobtL0jw/BU4lCQEuJG55FDYEdTsQKCrv8nzdLfatNtRpsqS038klR5boUoApaQw4So+7cEb1AXCtCXknHNjUptPO0idMuK1eiUturB/Ep/GpQyD+T61FhXqQjEM5scu2OkpSqb4sd7k36BxKUlJ+4/dVhuGjhbg6GrmZFe7qxesqmM/Ji/HQUsRGSQVIb5vaJUQklRA7AAdyQrP8AyguSKncQFlx5KuZqz2YO7ei3lqUofg0j8a3fiFSNOP5NfT/T9DiUSriYaXkj64Dan3f7S2q8HHDoXmt21LTqji1ll3i1yILceeiGguuxHG+YBZQOpQpJHUA7FPXuKgbPM91h4g7rimKz8ZdkSrSwIMGDbre61zrISkuOcxOyiEpBO4AA7UFuv5PvGPm3QS+5Q43yu3m7FtKvtNMICUn95xwfdVbuNmHd4fGFc5l6jrchSYkV2CFEpS7HSnYpSfL2goHbsTVrMzkZBwt/yeVut+PSGmsigIjxTKShLqG5L73O8sAjZQBWsDceQqH8guF04oOBrIdSM7h2W35Bh0hRt1xgpLXyhASnxW3UknlCuYbDfqoAgDeg8Wu2is/WjHMR1S0Aw60v44uytxn4tsUhmUl5K1cwW0dgSjok7Eq3B6dqtJqtqS/oPwosXi4vNv5FHt0a2Q0Onn8eb4SUEn7QBSpZ+Hvqs38nfll+Ob5XhBddcsi7eLoltRJSzIDrbfs+hWlfX18MelaDxr6ufz/1yVidqk+JY8XK4qORXsvSj+eX6dNg2D7lUE5aR8e+NXkR7Pq1bPmCbsEfPEFKnYjh9Vtjdbe/u5h7gKt/Z71Z8hszF4sN1h3OA+OZqXCeS62se5SSRVFtLuHbh01n4fbNbMdzDwc5ixyufOjLKXw8olSkuRXCOdtO+ySnY7Adas1w66JtaGaSqxp2ezcbpKluS50xlKkocUTyoCQrqAEAfeVe6g/OrnDngWrEd2a/FTZch2/J3eE2ApR9HkdA4Pj19DVL7zjetHCxqAi6QpTsWO6vlbuMUFyDPT9hxJ6b9Poq9oeRO29dL68N4s9qyCxyLNfLdGuFvko5Ho0lsOIWPeD/AH+VBEehnFBimrKGrHdEtWHKttvkDjm7Uo+ZYWe/ryH2h7+9T1XPrXThRvGEyHsz0uTMnWZk+O7AQsqlQNuvM2R1cQO+49pO3n3rceHni951RcK1amgKOzUPIXD9LyCJJ9fRz971IXUr+Eb1/ELQ62lxtQUlQ3CkncEeor9UHkfa3HWsJNZIBNbIpO4rwS4/Mk9KDTJClNr3/vrnpxP6OjAc4OV2GMU43eXlKCEDpDknqpv3JV1Un7x5V0YuMQjcgVHGbWPGMytM7AcgcYeM2IXlROYeMhAVypfQPIpX2Pr07E0HLGsjYL9d8XyaDkNgnuwLnBeS/GktHZTax/ePIjsQSKzWouAXrTXPZeM3lPOWzzxpSR7Elk/RcT/cR5EEVqlBee5aUYPxeaNtanYbFtuPahsj5PdGAgBiTIQnql0AdCobKS5tvsQDvt0i3STX7UfhrzN7T/PLTOk2OK74cizyTs/B3O/PHUTsUnvy78qh1BHesZwganOYFr7GssySpFoyQJt76CfZS/v+QX8eYlH/ALz3VcniP0es+rmlE95i3M/zrtkdT9rmJAS4opHMWFK80KAPQ9jsR1oJfwnOcW1Ew6Lk+I3di5W6QOi2z7TavNC090LHmk9a2KuPGkWseZaLZym847IWYy1hNwtL6iGZaQdilafqrHUBQ6pPqNweqmmGpuL6s6exctxaSVx3fyb8dzo7FdAHM04PJQ3+BBBHQ0G50pSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpQ9KD8qVyjeuYHFxrm9qhqg5jFjmFWK2F1TTIQr2JcgbpW+fUDqlPu3P1jV0OKvUlzTjhxu8qBI8K7XT/iuCoH2krcGy1j9VHN+INcpO3mT7z3oNu0uw9zPtY8dxJKSW581CHztuEsg8zhPu5QR99dXbjdrfj2NSJzpEe3W6Kp1Q8m2W0b/AMEpqinBJjYm6qX3K3mt0WuAI7K/R15Wx/sBVT3xW5iMX4b7nEae5Jl6cRbGQD15VHmcPw5ElJ/XFBz4yW+y8ozK7ZJPJMm5THZjnXfZTiyoj4Dfav5j2PXnKsji2GwW92dcJS+RplodT6knsEjuSegrM6fac5PqXlSLHjMPnKdlSJbm4Zio+04ry9w7k9BVuXo2n3CrpYqUw2m55HOSW0OO7JfnuDy6fm2EnuB+JJoPLZYmE8KmlCp97dRcsruaN1NMqAclLHZpvf6LKD3We5699hUf6HjJuILiti5TmLxkwbCn5wLCAQxH2VsyyhPkObqT3PLuar9lmWX7NsrlZHkk9cubIVuVHoltPkhCeyUjyAroHweYAcQ0JZvM1jw7jkLvy9zmHVLI9llJ+7dX7QNBZOFH7FXc9TWYaQEivHFHsiveO1B/a+UiQxFiuSZLzbLLSStbjiglKEgbkknoAPWv2taW0Fa1BKQNySdgBVAeKDiPkZ7dXdNNPJLq7Al3wJkqNuVXR3cANo26loHp0+mfdtuH84jeJ24agXB7TzTV6Qmwqc+TyJscK8a6L328NsDqGiemw6r+HSpB4d+FSLjjcPN9TITci9dHoVncAU3C8wp0dlOdjy9k+81mOGnhrj4BEj5xm8Vt/KnUc0aIsBSbYkj+LxHc/V7DruaswaDAZhm+JYBjTmQZlf4VmtyDyl+UvbmV9lKRupavckE1qWnnEDpHqleHLRhmYRpdyQCoQn0KjvLSO6kJWBzjz6bkDqRVCeKLJpOf8bz+JZfe3bTjlpuDFpaWRuiGyoILj/L25iV7k+gHkKlFXBpj+mGqbeod41VVa9OrKhu5IuRdDM8uhW6WkrT067Ahaep5gAnfqAnTjE0//n1wuXd+MwXbjYVC7xeUEqIR0dSNvVBV+FUNxHTFeregFyvGHR/EzTDlAyoEcHxLnbl7qbdQB3dbIWnp1UlI89t+hOj3ELp9r8jILLaGH4r8RS212+dsHJUNQ5fGSB5Hcgp7p3G/euauaWLKdI9ecqwCzXuVZ1Lkrta3mX1R0PxHFhSAtW/5sjk38tgaC3/CVxYHJfkWl+plxSm9ISGbTeH1bfLQOgZdJ/rRt0Ufpdj17wFxUYPcdGuLJeSY3zQI1yfTfrU82Ngy8F7uJH6rgJ29FVmtQeB3UvC8MsV4xiZ/O26yHktT4NsZKDEWojkW2ondaAfpLITy9DttuRbG1aAT9S9C8Rx/iOebu99sb5eQ9bZCkOKbKeXwn3R9MkAcykbb8o2PckIl4icLlcSvDjg2tOnlncuN+bZTHmQYvtPKbWeVxvbzLTwV9y1msxp7w06mZZwsRtKNYbnGstsh3FufbBDUJM6M2OYrYXv+TA3USPpbdepFWsxXEsawfGGMdxGyxLPa2NyiNERyp3PdR8yo+ZO5PnWVkSI8SKuTKfaYYQN1OurCEpHvJ6UGj6SaS4vozga8UxNy4OxHZBluuTn/ABVrdKUpJHkkbJHQdO9bpDgQbc2tu3wo8RDiy4tMdpLQWonckhIG5JJ6moYzXiw0dw5bsZi9O5FNb3Bj2ZHip39C6SEfx3qBMp468rlFTOI4farSg9EvXB5Upw+8JTyJB93tUF6q/i1BtsrcPIkd1K6D8a5rK1X4otSXlItFzy6UlXTw7FDVGSB6btJSdviTX6b4eOJXLHBIudkuqirqXLvdUNq+8LXv/Cg6IycrxaESJmS2aOR3D05pBH4qrx/5QcC32/nxjW/p86x//nqiUbgp1llJ3kycdik+T05Sz/ZSa9f/AAG9VuXf59xLf08d7/8AVUF742UYzNIEPI7PIJ7Bmc0vf8FVlUkLQFo9pJ7KHUfjXO+VwV6zRUkxnselEdgzPKN/30prEL0A4mMPV8otlkvbZR1C7NdEuq+4Nr3oOlHnuDsfUGvwlppLqnUtoS4ropYSApXxPc1zZb1k4ntOJKWbzdMoYCT1Zv8ABMgH3FTqSR9xFSNivHbkLBQ1mGF264oHRci1vqjrHv5F8wJ926aC3GpOn9i1R0wuuD5Gl0Qbg2B4rJ2cZcSeZDifelQB69KoJkHA9rxZZEqw4rfLdecfluBS+S4riIc27KeYII3Hr7VXAwjil0dzZbUZOQmxT3NgIl5R4G5PkHNyhR9wVvUxtOtPsJeZcQ60sbpcbUFJV8COhoKbRsVh8FPCLkF+kXKNOz/ISmG080N20PFKg2hsHqpDSS44pR+kfT2RVcOFXSXE9Y9XrhEz26IMFiKpwQzNDMqc+s9C2d+ZXL1Wojf310yzzTjCdTcaNhznHot3hglTfigpcYURtztrSQpCtvMEVSHVbgMyXH5DuQ6OXx27MskuotUxYZmNbddmnRslw+gPKew9o0Ep6a8E9u044kbfnMfKnLnj1uS5IiQ30luUiR2Qlak9FoAKleW5SncHrVtKjzQ2w5tjmg2P23US9zrtkfgeLLcmrC3GCo7hkq7q5BsnckkkVv777MaM5JkOoZZaQXHHHFcqUJA3KiT2AA33oMHm+aY/p7gVyzDJ5gi2y3tF1xXdSz9VCB5rUdgB6n41TfS3j4+cNRptv1QtMe3WCdKJgT4aSTbkHolD4/rE9iVjqCT0IqFuLDiFe1iz/wCYcelLThlndUmIEkgT3uxkqHmPJAPYde5NeS8wuHuy8E8Ri3Xlq+6oXKYzLW400tDkDY7OMK3A2aCOYdfprIUOgGwdVIM6Hc7axcLdLZlxJCA6zIYWFocSeoUlQ6EH1FVZ4h+FOLkjcrNdMoLca9e07MtDQCW53mVtDshzv07K9xrx/wAn5c8kmaGX+Fc3JDlnhXQN2xTvUI3b5nUIP2QrY7dgSat176ChnDnxO3HT24s6e6kuyF2BLnydiXIB8a1K325HAepaB6EHqj4dKv8AR5LEuI1KivNvMupC23G1BSVpI3BBHQgjzqrvEtw2R9QYcjN8JitsZUyjmkRUDlTc0gfgHgOx+t2PXY1EvC/xHScBu7WmmoUh5FgW74ESVJ3CrU7vsW179Q0T0O/0D7t9g6A183EcySK/SFocbStCgpKhuFJO4I9a/R7UGFnRgUnpVDuJvK77phxg43mdu51IFpQCwT7MhkLKXm/v6fAgGr/SQCkjaqe8cuCuXjS+15tDZK3rFILUkpG5+Tu9N/glYBP6woM7n2C4lrppVCkJeSj5QwJlpuiE7qjladxuPNB6BSfdv0Iqg2Z4VkWA5Y/j2SwVRZTXVKh1beRv0cbV9ZJ9fuOxqxfDBrfa7XamtMsvlJiN+MTaZzp2bBWrcsLP1faJKSenUjp03sTqFprjWpOLrseSQ9yndUaY2AH4i/tNn+9J6KHf1oOZzD70WU1JjOKbeaWHG1pOxSoHcEe/cV1s0zzdOb6VY/lzKkhdwhtvObdkuj2XAPcFpUPurmZqlpLlGlWSfIL018ot76j8iubKT4UkDy/RWPNJ6/EdatbwT5iblpbeMOkO7vWeX47CSevgvDfYe4LSfvXQVx4mMKawfiSv8OGx4VvuCk3OIkDolL3tKSPgrm/Gvrw5a1z9GNWWJrzzi8cuKkRrtF33Hh79Hkj7aN9/eNx51MnHPj/McRy1tG5AetjqgOw3DqN/vUofdVOqDuLDlx50FmZEebejvIS6062d0rSobhQPmCCCK+9VY4H9S5GW6JP4hc3i5Oxl1MdpalbqXFWOZvf9U8yd/h6VaYHeg/tKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFQi/qa9mvFqzphjEpXzTi0ZdzyGS0rYPSOiGYoUPJKlpWoeZTy/VO+S4itYI+jmi06+MONqvkveHaWFbHmfUPpkeaUD2j027A96iLggxZ636M3rUG5rcfuWTXFajIdPMpxpkqTuSeu5dU8T8BQRfx+5SuZqHi2HtOkswITk91H+kdVypP7iTVPKnbjBuK7jxbX8KVuIseNFT17BLe//iqCTuBuO9BfLgtsohaGXC7qRyuXK6udduqkNISlJ/FSvwrBapYrf+I7iIOK2WUYmIYgfktwun0kCSvZTqWx9dzYJQB22G5rbrPc52kHB1itps8bx8qusduFaYm26nJsklzcj0bSvc+gRWcu2S4dwv6AwLdPeTPvCkKcTFSsB+6TF+066o+Sec9V9gAAOuwoP5f7nprw2aSIjxIrcZrqIsJshUm4v7fSUruf0lnokdu4BoNnedX/AFEzSTkmQyfEfd9lplBPhR2x2bbHkkfxPU1/c8z3JNR8zkZNk8zx5TvsttIHK1HbHZttPkkfiT1O5Na22048+hlltbji1BCEISVKUSdgAB3JPlQbfpZgsvUfVqzYpGQrwpDwXKcA/NMI9pxR/ZBHvJA866x2aMxDhsRIjKWWGW0tNNp7IQkAJSPcAAPuqvHDToz/AJNMLN3vTAGTXZCVSQRuYrXdLAPrv1Vt57Dryg1ZK3Nk7Hagz8UeyK9u+w615mE7IFQpxNa3I0l04+R2d9Bym7JU1AR3LCOy5BHonfYeqiKCJOLviGciCVpPhc1SH1DkvU5lWxQkj/kyCPMj6Z8h7Pma9vCnw7DH4cbU3Obftd30By1QH09YbZHR5aT2cUD7IPVI69z0jnhT0Ocz/KV6m5ow5JssKSVxkSPa+cZYVupat/pIQrqftK6eR3vzQa1nWfYlpth7uT5neGrXbG3ENF5YKipajsEpSOqj3Ow8gTWRx7I7DlmPMX3GrvDuttkDduVEdDiFe7cdj6g7EelUe/lBMRzxy5WLNPnF6bhrKBEENCdkW+Sd/wAorb6XiDoFHtty9qr7gUjV7TXFE6p6S36W/ZUKDd1RCHiphuD+rmxjuAk90ubcqgR1Ct0gLPccHD/LvkdWseIwVPy4rIbvkRlO6nGU/RkADuUjor9HY+VQtptlNs1704s+gOpOVP2i4wJSHcYvzqytsg+yqI8knZZ5d/DUeoOyd/WxGjvHRhOXss2LVKKzi10WA38vBK7fIJ6HmJ3LO/ordPf2h2rQNcuCefdb2c30GcgTbbcD8oVZxKQ2GlH2ueM6TyFs9+UqHL5EjoAgrUjE8n4VOKJprG78tciAGrjbZytkqeYc3HI8gdOpStCk9iBv51ZS9aIx+MG64frLGfXiVumW35LfGHGCZDjrStkljf2VoIOwWemyfM15dAeEbPRqmxqLrs63IVCH5C1S5SZ7slfLypLygVJDaQeidzv57VeCPHYixGokVltlhlAbbabSEpQkDYJAHQADyoPLZ7WxZccgWaO9JfZhR24zbspzxHVpQkJBWr6yiB1Pma/V0u1ssdoful5uEaBBYTzOyZLgbbQPeo//AEaifWbiNwvSOM5bitN6yYp3btEZwDwtx0U+vr4Y93VR8h5il0u5638UWcfJGkSbiw2vdMVndm3W9J81H6I+Kt1H3mgsFqbxsWG1KetemVr+e5Q3T86TQW4yT6oR9Jz13Owqv7MXiD4kLsXea73qGpX5xxXya2sjfy7IIHu5iKs9pbwc4NiSGbnnTicruydl+AtJRCaPoG+7nxX0/RFWQYjx4kREaKw1HYbGyGmkhCEj3AdBQU8wrgahMsNzdR8uddIG64FnTyJA9C8rr96RU6YppBozhbSRZMHt3igdZMxgSnVH1KnN+vwAreLlN8dzwWz+TT3P2jWPoM2i6QW2UstpWhtI2ShKNkge4dhX6+doY7eJ+7WCpQZ4XaIe3ifu0N3iA7HxP3a0vILs9Z4EV5htC1PTGY559+gWrYn41l1fTNBnPneH/pP3aG7Qj38T92sFSg2dSWJcPw3EIeYWOrawFJI94PSo5y3h/wBIc0bWbvhFuZfUNhKt6PkjqfeC3sN/iDW6WiVsTGWendH/AJVl6CmGc8C5Db0rTrLCo7Ept15T3/RDyR/FQqHET+IPhvvCW3lXezRArYNv7yrc+N+w7oAPoCkmumVfCbChXK3uwLjEYlxXQUuMSGw4hYPkUnpQVg0y408Uv6mLXqLb/wCbk9Wyfl7O7kNZ9VfWb+/cVZ6DOhXO3Mz7dLYlxH087T7DgcQ4n1SodCKrLqnwYYjkTT1004kIxq5ndXyF0qXCdPoB1U1+zun9Gq32PL9bOGLNjZpkeVDilfM5apwLkKYnzU0odOv20EEefmKDplVPePHUXN8dwKBhlitNwiWK8De431sbNubHpECh1STtzK323GwG/Wps0e1+wnWC3JZtz/zZfkI5n7NKWPFHqpo9PER7wNx5gVI97slnyTH5div9si3K2y2y1IiSmwttxJ8iD/f3FBzT4c8V4fY+k+V5zrHktplyvk7kOPYi4RIjo2/OIRtup5ZACNtwnue5rTeFvS/GNXdeFYplka5PWtEB6WfkT/gqQUFPLzq2Psnfl+JFWI1A/k9WZ2WKn6b5hGttreWVG33Zpbqou/k26nqtPoFDf9I1INnxTTPge0OuWU3CW5fcjuO0cPqSGnJ7oBUiO0nc+G0NipR3J6bknYABJ+Y5ppdwzaMRg5GYtVripLFts8IDxpbm2/KgHqST1UtXbfcnyqpGi/E7rbqFxfNORbc7d7PdiI7+PRzysW+Ikkh5Kz9FSOYlS1fT3I80gQ0wxq7xda9KWpSpkxzbncIKYVoi834JSPT6Sz6ntaDMM2014LNK1YDp23FvWos9pKpct4BSkK2/PSNj7KRvuhkfE9OpC6PuNVN4rOHYZFClamYRA3vLCSu6QGEdZrYHV5KR3dSO47qHXuOui8EeV655VqHfrvdpUm74ZOdcfuU66LVsJhA2MY7dVdgpA2SEgdiBV7BQU94ROIZcj5JpNmk0qdSnksk55X0kgf8AJlk+YH0D6ez6VdHcEbg1z44rNDXMDycan4YyuPZZskLlNx90m3SircLSR9FC1dR9lXTsRtZLhl1uRqzpz8ivEhH86bSlLc9HYvo7IkAeittleigaCapH0TWqZJabffrDNst2jJkwJrK48hlXZaFDYj4+h8jsa22QN0nasFNQRvQcktWtNrlpXqjcMUnhTkdB8WFJI6SI6j7Cvj9UjyINSroxxQXLEmo+NZ/8pu1kRs2xPT7cqGnyB3/OoHoTzDyJq1mvej0DVzTtcNtLbN/gBT1rlq6bL26tKP2F7AH0Ox8q5o3S13GyXqVaLtDdhzojqmX47ydlNrB2IIoOoS4eD6r6dKZcVByHHrgnotpQUnfboQe6HE7+5Q+B61zsWBXHhh4lbPeDPXLwXInDaVTnOio5X1Ql8DpulQSQrsrbyNV0011WzHSvIvnPF54DDhHyq3v7rjyU+ik+R9FDYj1q8mL6iabcTOlNyw6U4m33OXHIk2qQsePHWOqXmVdOcJVsQpPUeYFB8OLSxG88M91kJbCnLVIYnjbuAlfhq2/70fhXOyuiWITbrneiuV6UZiUnLrJGdss0K6fKElsiNKSPNKgEde26dq53KQppxTSwQpBKSD6jpQWZ4GclVZ+JN+yKc5Wb1a3WSCe62iHEff1VVprlqndNJeLpOJ5hLUvCs1SiTaJr6jtbpmwbcaKj/VqUAduyS4k9iaojw4XM2niswWZzEJ+cg0vbzSttadvxIq9XF1hbGY8Ll1uCW97jjqk3WM4n6SUoOzo39PDKj8Up9KCyG+9Kr3wl61K1V0fTbr3LDmTWLliTSpXtyG9vyb/v3A2UftD31YSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgV+Fq2Hvr9ntUYa+agf5NeH/I8pacSmY3GMeED9aQ77Df4E7/AHUFAeLzVD/KJxCS7fBkl2zY7zW6Lyq3StwHd5weXVXs7+iavFoZCRZuFzBYTaQkGzMPqA+06nxFH8VmuUK1rdeU444pxalFSlqO5USdyT7ydzXVfRyembw2YM+gjb5iiIO3kUtJSf4igoBxOrUvizzZSv8ApqNvh4LdalpfiS851fsGMBJLMqWkyCOnKyj23D9yEqrd+KhjwOKnJVbbeMGHvju2Bv8AwrSsPyxGH4zkkmA4pF9ucVNriup6GOw4eaQ4D5KIShA8/bUfLqFnka7aeTtdckzq+3BK4eHQFRcXtaUnaa6o8rryD25yQEp9Ee0PSqrZ7nWQ6jZzMynJZRelyDshpJ/Jx2x9FpseSUj8e56mta7DYdK+0SJKnz2YUGM7JkvrDbTLKCtbiidglIHUk+lB8kpKlBKQSSdgB1JNXP4b+HtWPqi5/nEIi7nZy3W10f8AJAR0dcH+cIPRP1e/ft7dBeG6Ph5jZhnbDUnIOjkWASFtQPRSvJTv8E+W561ZmKwpatyNyetB7oDBUsHatrgMcqU7isZb4e2x2rYmWw2igx+T5LZ8Nwu5ZPfpIj263sKffX57DskDzUTsAPMkCublth5VxUcUTr0tbkdmUvxZC0nmTboKD0Qn37HlHqpRNSdxq6tqu+TRtKbHJUqJb1JkXTwjuHZBH5Nrp35AdyPtK69U1PXDRpGnS3SFhdyjpTkV4CZlwUR7TQI3bY/YB6j7RPoKCWLBYbVjGMwcescNES3QWUsR2EDolIH8T5k+ZNV3Vxs6XQ9d7vgl4DsSzRHhFYyVtXix3Hh0c50jqlAV7IWNwdiTsNq2riK4jbRoJZbSTa03u9XJ78lbQ/4RDCfpuqVsdhvslPTqd/SqZ6gZhwva2LXd0Q7vpXlru6nJQhiVbpCj/nUs+1v+klAPrv2oOjt1tuMaiafSbXNES9Y/eIpbWW1hxp9pQ7pUOm46EEdiAe4rmfemNQOC7iXlN2hYuFomMq8BMxJ+T3eEo/QcA+ug9Dt2UPRXXA4Dq/qZw6ZIG8ayW1X/AB55fMuEzL+VQJKfVI6LYXt6pQr3EVbK4ZxpDxqaOu4YiU1j2dMJMm2wrioB1iSE/wBUvs80odFAbK26lI2BoKw6WcNme8QePZLqDAm2izo+Ur+SoWyGmZcgnmW2hKOjSEggA7bAkD1NW/4QNE9QdKMPuMrPL3PjuTFluPjQkB2NESFfnj3AcVt05dhynruT01fgm0g1S08cyS65g9Ks1okuGK1Y3gFfKHm1FJk9fopGxSkjbnB37bVcHoB5AUAkAbk7VUHiD4tE2l2Xhelk1tyYjdqbfkbKQweykMb9FK9V9h5bmtb4muJl29yZem+nE5QtwUWLldYyvalnsWWSOvJv0Kh1Ueg6d9g4ceFZqE3Dz3VC3JclHlet9jeG6WvNLj6fNXmEdh3PXoAjzRLhayLUx9GZahyJ1ssUhfjhLij8suRJ3Kt1dUJP2zuT5Dzq92NYvj+HY3HsGM2mNbLcwNkMR07Df7RPdSj5qO5NZcAAAAAAdNhSgVirnO23jMq6/XI/ur73GaI7fhNn8oofgKwNApSlAr+jb61fyo71ryS84vpcu42KYYkpUltrxUpBISd99t+1B9tT8kstoi2qLNucdh0XSK4pta/aDYUSVEd9vfW/NrbfbS80sLQscyVJO4UD5iuYOrF/vc2XAukq6y3Zilq5n1uEqPQdN/SrE8E+bZRkQySy3u8PzYUFDLkZDx5i2pRUFde/kKC2p6Half09zX8oP0hakOBaTsQdxWyRZCZMZLo79iPQ1rNe22SfAlcizshfT4Ggz9KUoFYHL8LxjPMYex/LLPHuUF0fQdT7TavtIV3QoeorPUoOdms3Dbl+jlzGZ4RNn3CwxnPGRNjkol2079C5y9eUf5wfeBU08PnFdGy16LhepMhiHfFbNxLsdkMzj5Jc8kOHyP0Ve49KtQtCHG1NuIStCgUqSobhQPcEHuKpTxH8K4tzUzP9L4KjFTu/cLGyCSyO6nWB3KfMoHbuPSguxVKP5Q3EshuOK4jmMJt1+zWpciNNCNyGFvFstuKHkk8hTv5Egede3hh4mlPuQtNdRZ/M4rlYtV4fV9LySw8o+fklZ79AfKrg3G3QLtapNrusJibCktll+NIQFtuoI2KVJPcUHNzEOKbFtJeFmBhuleKvRM2lIV86XSa2koQ8dwXwe7qttghJ2Snbr6HBcPvDhlfEBmDua5rLuDOLKkKem3R5ZMi6O77qbaUrvufpOdk+W52FW5RwQaBsZeq/Ltl1VDCvF+aXJyvkqfPb7XL+iTtt0rR9buMvE9ObUrAtFYtvuFyiI+Sicy2Pm+3AdOVpI6OqHu9geqqCcc61M0n4b9NYcGYY1tjR2PDtlgtyQX3wOwQjyG/dxXTuSSajHhv4tl6zanXnD8js0WzSnUmXZW4xU4FMoH5RpxR7rH0uboDuR5Deo2mOh+rvE3mj+V3afLFtee/p2TXUqUFdeqGU/wBYoeSU7JT03I7G+VgxnQzhP02MmROg2dLidpF0nkOTrisDfZIA5le5CBsP40EuX2x2vJcanWC9w0S7dOZUxIYWNwtChsfgfMHyNc37rCyrhX4om34DjshiKvxo61eym4wVnqhXv2HKfRSQavNo1rfh2t+N3K8Yl8rZTb5hivRpqUoeSCN0OFIJ2Ssc23X6prA8S2kTeqekT67dHCsis6VS7cpKd1O7Ddxj384HQfaA9TQSzi+TWjNMJtuUWGQH7fcWEvsr8wD3Sr0UDuCPIgivpNZ3BO1Um4K9W1WfJ5OlN8kKTEuK1SLX4h6NSAPyjXXtzgbgfaT+kavO62Fo3A33oNOltlKz0qt3EfoE1qPbl5Xi7KGsriNbKaGwTcW0johR8nB9VXn2PlVpJ8Tck7VrsllSVn30HIR9h+LKdiyWXGX2lltxpxJSpCgdikg9iD5V6LVdblY73FvFomvQp8R0PR5LCuVbSx2INXj1h0OxrWK2ScswqRGiZKw65Hcc25Wpi2iUqbd2+i4CNgv7juNtqP3my3bHb9Jst8t78C4RV+G9HfTyqQf8QR1BHQggjpQWpsOrdwyaFA1ziQkpyHFw3a8whRE9LjbHCAmUlA7FCvLyPQdN6grW/H4mPa4XoWxaHLVcVJusB1v6DjEgeIkp9wJUn9mtEiT51vU4qDNkRi62WnPBcKOdBGxSrbuCD2NZW6ZE7eMQs1rncy5NoDkaO8eu8ZR50tn9RZWR7nCPqigy2ka3Ea8YctrfnF4jbbf9YN/4b11QzmKLxpPlVpKeYS7VKY29eZpQrmZw620XTihwyOpPM23OL7nuShtZ3/Hlrpje7gm34Td7g71QxBedV7wGyTQc1eHHVB3SvXqz3115SbVOKbfc0A9FMOEDmP6iuVX3GuuDLqXWkrQtKkqG4Uk7gjyIrhsgDwUpUNxygEevSur/AAr6gLz/AIZ7BMlyC9cbak2qapR3UVtdEqP6yOVX30E30oDuKUClKUClKUClKUClKUClKUClKUH4cVsKpD/KA5atuy4hhTLp5ZDz1zkJB8mwG0A+4lxRHvTV2JKtkmuZXG3fvnbihctyV7otVsjxSn0WrmdP8HEUFca6U8LV0+c+FHGgpZK4vyiKr3cj6+UfulNc1qv7wVS1yOHeewrtGvb7afgWmV/3qNBFHGViFri5yjNBel/OUxEeJ81+CAPDQhW73Pvuep222++qs1avjiSEagYmR3ctr5P7LwH+NQHpzpzkGpmYt2KxNhCUjxJUxwHworf2lep8gnuT95AYrFcTyDNcnYsGNW12dOeO/KgbJbT5rWrslI8yavhovoLj2l0Vu5yOS65O4jZ2epO6WN+6GAew8irufcOlbFppphjWmmNptVgilb7gHyqe6kF6UoeaiOw9EjoKg7iA4kFQlzMD07mpL+xZuF5ZVv4Z7KaYI+t3Cl+XUDzNBLbWqa8o4lbfpjhrzT8O3pcl364o2WPyY6RkHt1VslSvU7DzIn63weg3FVE4EsQ5rRlGcPt7qffRa2HD19lADjo/FTVXchxwkDpQfuNGCEjpWq6s5/C0y0jvGXS1JLkVkpitK/rpCujaNvP2uvwBreAAlFUK429RHLzqDbdN7c6tca1IEqYhs7+JJcGyEbeZSny9VCg1nhb09l6q6/Sc2ycGbBtD3zlMceHMJMtaiW0nfv7QKyPRIB710RqMdANOG9MdCrRZHmUpukpHy+5LHcvuAEp38wlPKge5NQjxt67ZBp5AsWEYTdpdqvU0/OUmfG3QtphB2QhKiNt1K79+idj3oJa1u4b8B1wgCTeW3rbkDDXhRb3D6uNpG5CFoJ5XEbnsdj6EVzl1U4f9QtDr8H8qsDV3sJXytXWNzqiPDyCikhTSvcrb76lDFuNjXjErTDl5ZaoOSWqR7DEyfFVHLux6hL7eyVqHmPLzFTfjfHfpBlluXaNQcZuVjbkp8J9D7KZ8RaT359tjy/FJoKnYTpxo9qotu2WTPpeBZM5slu2ZIlMiFJWfJqWjlIP6KkA/Gpf0w4G9QrVr3ZpGdqtq8WgOic7Nts3cyS2QUNJT0cTzHbdXT2QdjvXpz7hi0o1RjvZJw1Z1YX5rm7isYXMAQ55nwQv8o2f0VJ5feKufpBg83TnRTH8Pud4lXadCjgSZch1TpLijzKSkq68iSeVI8gBQbvv5mqgcWnEGu1NSNLMJuHJNcTy3mewvqygjrHSR2UR9I+Q6dydpY4j9Z29I9NdrY4hWS3UKZtrZ6+Ft9N9Q9E79PVRFVk4WNEHdSMyd1EzJhcmwQJBWhMj2vnKXvuebf6SEnqr1Vsn7VBv/AArcOCIceHqfn1u3lLCXrPbZCfzKe6ZDiT9Y90pPYdfMVcOv4AEgAAADyFf2gV5pktMVjfoVn6Ir6PvojsFxZ6DsPWtcffXIfU653PYelB+VrU44VrUVKPUk1+aUoFKUoFRLxFf+pv8A/vWv7zUtj6Xf7qp7rHqHkd5zq8YfLnoNthSz4cdDXL9HsSrzNBXHU/8A5Jbv11/3Cp84Dh/x7mB/0Mf+9VR9acUtWa48iTfI0x9bL7iUGO6hsDrt5nevXplqFJ0Xy66tYxZI8xuWUoeblOq3ISARsR2PtGg6FK+kfjX8qP8ASLU9OqWKzbsLQu2Ow5AjOslwOAkp5twR5VIFApSlBn7bK+URuVR/KI6H3++vbWtRJBjSkuDt2UPdWyJUFoCkncEbg0H9pSlApSlBSPiq4ckWsy9UMCgckMqLt4tsdPRkk9ZDaR2Tv9JI7HqOhO27cKXEGvMbc1pzmc/nyCI3/wAXzHle1PZSPoE+bqR591J94O9pHG23mVtOoS42sFKkLG4UCNiCD3BFc7eI7RydotqbDzTCy/EsMySH4LzJINulJPN4W/kOnMn3bjy6hfzKsateZYTdMVvSHF2+5xlxXw0soVyKG26SOxHQj4delUtwLgnxDALtcsw10yu2O47bZDnySIp7wGH2kk8jslZII3AB8JP3nyNmNBtXYer+lrN3WWmb1EIj3SIjpyO7dFpH2FjqPTqPKsTxQ6RK1f0Bn2u3tlV9th+crX7RAW6gHmaPl7aeZI37K5T5UEAar8dFlsFsOJaEWSL4MZvwG7xJjhqMwkDYfJ4423A8irZPuUKgDD9H9d+JrLVZNNcnSo7ytnsjvi1JjoT6NDb2gPJDY2HurYuDLFtK8s1tlWDUay/OF2S18os8eWsiOtxv84hxv6ywPaAPoRtXUCPHYjRmo0VltlltIQ200gJShI7BKR0A9woIb0E4b8T0It0p+2XGfdb5PaS1NuD6y2haQeYJQyDypAPmd1e8b7VNFRHqpxJ6T6SIejZBkKJt4QNhZrZs/J39FgHlb/aIPuNfLh918tOvOKXa5xLWbRNtswsu29bwdWGlDdpwkbb7jcHptuCKCqHFPp7L0s18i5vjAVChXd75yiONdBGmIUC4kHy3UQsfrKA7VePSXP4WpukVmy6KpPiSmQmU0P6qQno4gjy9rr8CK1/X3ThvU7Qu72NppKrnGQZ1tWe6X2wSE/BQ5kn3KqsPBHqI7ZdQrlpvcXFIjXZBlREOHbw5LY9tGx7FSfL1SaC9UqOFAnatbuMEkK2HWtvICkb96xsxgKBoKTW7P4uknGBmeE5TL+SY/kMpF0iSHPzcZ95II3PkhQ9knsCkepqR9VtHcU1XswF0bES7NN7RLtHALjfmAr/ON9d+U+u4IqJ+OvCS1IxrPY7XsHntMpQHTfq40T6k/lB8E1q3DxxDG0mJgGeTCq3Ehq3XR5W5jE9mnSf6v0V9Xt2oIN1C01ynTTJDacjhcqFkmNNa3UxJSPNCvX1SeorUK6hZnhtizjE5OPZFBTKhvp3B+s0vb2XEK8lDuCP7q5/ar6S3/SvKPkc8KlWqQomDckp2S8kfVV9lwDun7x07BvvB3b0zOJNuUvtDtkl0frHlSP7zV19YrkLTw7ZrNJAKbLJSnf7SmylP8SKpxwWn/wDeAnJ272d7/WTVkuLG5m28K18aQrlXNfjRQfcXkqUP3UGg5v8AbpV0/wCT9ylbN+zDDXXfybzLNzYb3+skltw/uloVSyp94Nryq1cWlmjBRCblElQleh/Jl3+9kUHUxtW6RX7ryxl8yK9VApSlApSlApSlApSlApSlApSv4e1B4JitkmuVXFgSeMDMSfNyL/8A6jNdUJ6tkGuYvGPB+ScU9wf5QPlkCLI+Pslv/d0EBVfLgiP/ANw97Tv/APx50/8A+OxVDavdwQEq0UvqB3+fF7fewzQa3xWY89n+umFYbZ32E3VTHgFDh3IQ8sq5+UdSlIQonb08t6m/T7TawaaYU1j1ibHKn8rKmObBclzb2nFny7dB2AFYHT6yMZVxNai6lSGw+mBIbxu1OEbhKGkAvKT7+ZRQahTij15ck3GXplhc7liNEtXecwrq8vzjpP2R9YjuenYdQ8uv/EgLg1KwbTqapMM7tT7y0di+OxaZPcI8ivuew6daqz2HuFKmPht0sXqXrHEVPilywWhSZlxUoeyvY7ts+8rUOo+yFe6gvpw5YYrBuHXGbNIZLUx2P8tlJI2IdePiEH3pBSn9mpoj9t6wME77bDYegrPM9ECg8GT3+Di+IXPIrk6G4duiuS3lHyShJUf7q50aE2CbrVxdDIL82p5hqU5f7hzdQOVe7TZP63Ike5FWU41M2Nh0LZxiO9yysglpZUAdj4DWy3D8CeRJ9yqx/BJhSbNo7PzKSzyyr7LKWlqHX5O17Kdj6FRUfuoLOPvtR4zsqU8hpptJcccWeVKEjqSSewFaLqjpRhGtGn6rDlERuQ0tPiwrlGKfGirI6ONL9PUdUqHQ14eICx5xk/Dnk+Oaex2X73cY3yUNuPBrmZUR4qUk9OZSOZIHT6Xeue+mPEFrBw35QcPyO3z5NojL5ZGN3gKbWwN9iWFnqjt023QaD0X+yau8HuozkKUzGv2IXNfKWpjHjWy8NDuhxtW4beA/aHkVJ74CBjFl4keK+NY9NsTjYNZJ6ELejsJC0w222+Z97lBCSSrcJSnlBHL0B3roPiOomjXE/ppLsyPk10Yfa/p9huKQiVGP2uXv0J6OI7e7faqcai8Jep2letVkn6US7nNtc+4ts226xFFMi2uLVsEvlPkBv7f0VAbK2oJ14feDmRpDrfJzbIcgt18YiR1ItBjtrbcS4vopx1ChsCE9ByqV9JXuq1N1ulvsdhm3q7SURoEJhciQ8s7BDaBuo/gK/VsjyotlhxZ01U6U0wht6UpISX1hICnCB0HMQTt76qrxsaom04rB0xtUnlk3QCZcik9Uxkq9hB/XWCT7keiqCALlKybik4pktRVOR2Zrvhxwvqm3QGz1UR6gdT6qUB2FdHcZxy0Yhh9uxmwxUxrdb2EsMtj0A6qPqSdyT6moC4PNKxiGlis2usblvGQpDjfOnZTMQH2E+7nO6z7uWrJ0CvytaW2ytZ2SBuTX6JAG56CsDcZpkOeE2r8kk/vGg+UyWqW/zdkD6Ka81KUClf0AEd680OdFmrkJYdCjHeLDm31VgAkfxFB6eU7b+VeeRNhxXWmpElptx1QQ2gq9pR9wrS84zSdZbh8025pCHC2FmQrqRv6Co/tk+bJyuNMkynHnwsqDizuQQDQT6ke15b1RTU9Sv8uOTIL7e3y1Z8MD2h17nrVtMPz5m8ut2q5qS1cSPYUOz3/kaqZqeFjW/JlFDQQZq/aH0j18/dQYzT9gu4mtQZSvaS51MVLv1vUkVoFwA/nrKBA6LPkPsp8tjUg6etpXiaypsK/pLnUtoV5+qlA1Hs7b+ekzrsOdXp9lNBbvhK3OneRk77m6J9f8176sCUkHY1U/QW8m3aOZCmBL8Ka3eGnkhPQhPJtv27VYvEsvi5FD8F0pZnoTutrfor9JPuoNkpSlArMWmVukxlnqOqfhWHr9NrU06lxB2Uk7ig2qlfOO8mRHS6nz7j0NfSgUpSgVr+cYdZs/0/ueI35kOQp7JQVfWaWOqHEnyUlWxB91bBSg5o6f5JkPDNxPP27IUuCKy98guzSB7MiMo7peSPPbcLH7Q710piyo8yExNhvofjvIS608g7pWkjcKB9CDVV+NLS0XnCouplpigz7OAxcCgdXIqj7Kj68ij+CqyfBpqgcp0wfwK6SOe548B8m5z1chqPsbfqK3T7gUetBqerOM6C8OOsqtZr9Zciu+QXiY5OtFphfkokaQB+UXz9ACVEq2UT9JRCTVdtReLHWzWK6HHMbVIsUCUS03Z8eStUh8HpyrdHtr37bDlSfSr2cTmlP+Vvh9ulmhRw5e4H/GNrO3tF5AO7Y/XTun47VQ/Q/iZOhWEXSxxtM7RcL64+pTN2eJZfQD0U08QCpSUkdAkjzB9aDaNMeBjUDJkt33U25s4ZZ+jr7byg7OUjuSoE8rXTfqs7j7JrG8MGTxtM+Og4tYLv8AO2O3WZIsfyps7pkNgqUy70GxIUkDft7SjWo3/UniE4lb+qwMu3e9MrVuLJZmS1EaHlzgbDbp3cVVrOGPhAlaa5RF1E1FmR37/FQowbXFVztQlKSUlxxf11hJIAHQbnuaC3/UHp3Fc3decfm6K8XP84rA2plh6Si/27l9kble7re/pzcwPuXXRiBcrfdIypFsnxZrKVqbLkZ5LqQpPQp3SSNwe48qrXxtYUm86NwMxjMFUqwygl1SR1+Tu+yrc+gUEn76CyWM5BByjD7ZkdscDkS4xW5bKh5pWkH/ABr2SeqTvVbuCrNTftC38XkO80rH5amkgnc+A7u42fgFeIke5NWSfG6OlBEOuuBDUjRC/wCLstpVOcZ8eCT02kN+0jr5b7FO/oo1yjeZdYfcjyGltOtqKHG1jZSVA7EEeRB6V2bm7hRNc+eL/So4zqAnUGzxgm03tzaWED2WJe25J9A4BzfrBXrQfHQPiNdxcx8Lz6U5IsRIbiXFZ5lwPRKz3U1/FPw7WxzHCbFqHgcvHbulL8Ga2FtSGiCWlbbodbPqOhHqPjXLyrPcMuv6scuEbTzNp/8AxI8oN26c+f8AkKyejSj/AJont9kn0PQM3w24JetNeKnILDkEdfixYKWGpDadm3kPLPhupJ+qQg/A9KkPjYleDw9W5gHq/fGE7e4MvK/wFbzrmXLLpanMoaiw9Y7nBuD7zfsqVGQ+A4hRHdBDhOx6b9aivjknIXplisdtXsyLkuQkb9wGTt/tKCj1Sfw6SlQuKfB30nYm5Jb/AH0KQf8AWqMKk3h3iqmcUmEsoBJFxDvT0QhSz/BNB1vhK9msgO1YiArcCssntQf2lKUClKUClKUClKUClKUCv4r6Nf2v4fo0GIuG3ITXPHjmtTjGr2PXrk2bmWtTAVt3LTpJ/wBqK6ITwOU1UzjQxM3vRFm/MNcz9jmpfUQOvguAtr+4EpUf1aDn5V5OCyezbNBsruMhYQ1Eubshaj2ATGbVv/CqN+dWq0wugxT+Toz66lXK5cZ7sNsg7E+Khhjp7xuo0G93rUNzSDgjtU1l0MZdlxfnsIJ3U25KcU6498EtqRsftEelUbUpS1la1KUpRJKlHcknuSfWtq1Bz276hZWi73PZpmNGagwYaDuiLHaQEIQn93cnzJ+FapQeiDCl3K5x7dAjrkS5LiWWWWxupxajsAPvrpxolptD0u0ug480lK7g5tJuUhP9dIUPa2/RSNkj3Cqf6FWm2YFGt2reWwFyFz7g3aMchkhJceWoJck9fqoSTsfXfbtXQmDFIeKe/Kop/A0GbtzZ2FZr6LdeSEzypHSvvJWltolaglI7qPYDzNBzz4x8lfyjiPYxeGsrRaIrUNCE9fy7xC1Ee/ZTY/Zq9uC4yxhmmtjxZhKUptsJqMrl7FYT7Z+9RUfvrnzpk3/lW49It0kJ8RiTfJF3WlQ3AbaKnQg+7ZKUj7q6T+XXvQUb4lOLjPtOeIh/E8BetpttqjNtzW5sNLqXpKvbV7fRQ5QpKSAR1BqLci4wLJqjYE2XWTRew35tO4bm2mY5Dkxj9pta/EUD7twDXSO6Yzj98SRecdtlzB/6ZCbf/wBdJrRL1w5aIX9KhctKsePN3MeIYx/+EU0HKOddbHjeVRsl0ryPI7a+w5zsiahLMuKe45XmlFLg95Sj9U966C8IPEVmmsrN2x3MbQy7Ks0Zt1V9jfk0yOZXKEON9g4eqt07AhJ6b9Tl7zwOaA3MlUewXmz7/wD9PuK0gf8AeBdSBorobiGhuO3S1YpInSk3KUJL0icpKnCEp5UI3SAClO6iP1jQSRKlR4MF+bMeSzHYbU666rshCQSpR9wAJrmlb2p3EjxleJIS4mFdLgXXQD1YgMjt8fDQB7yffVweLPNFYjw2XONGe8ObenEWtrlOyglfVwj9lOx/WqL+BfBkx7JkOocpkBclYtUIkdQ2jZbpHuKvDH7BoLfR47ESI1FjMoZYaQlttpA2ShIGwSPcAAK+lKUGJuk07mK0f1z/AIVia9E//wBJPfrV56BQDc9zSm+ySe3Tfeg/ZKEIK1qCUjqok7bCon0XyZq/3LNmhIQ4tF8dcQkK3JbUNgoe72e9VX1O1JzTKNTr+zjeT3ZFkkPqbYgh0pHKBsRyjyJSo7Vo0CVnWLzBcbfdJ1qdPseM0S0SD5b+dBdTUvpm53/zCO/31rtm/wDTsb9Y/wCqa0DTjK52T4mlN4ukm4XWISiQ/IVzFQJJT18+nSt1j3K32iY3cLpNYhxWtyt55YSlPsnzNB8MOmkcRlntxV0MIvbf+8UKivU9AGueTrEYD+mrHjb9T17bVqMbXCVaOJOHlFvixJVviqEBAUVJDjJXuV7+R6k1sef3K23bWbI5ttlJltLlKUHmXOdrY+hHTeg+WnwH80l7pSf6S53S0frfp9ajO8kjLpex2/Kr3/dT7wKk3T1aU4msFYB+Uud1tD636Y3qMrx1y+WR/nl/6qfSgnHQc74DkhHYy2/T0qatPB/9vovX6i/9WoW0J/5gZH13/pbf91TVp7/z9i/qL/1aCagNztQ8u/Q71gczuSrPp7ebmhZQpiItaVDyO3SvfZJfzhjFunA7+NGbWT7ygb0HupSlBkLXK8GQWVn2F9t/I1nK1Psd62G3yvlMUE/TT0VQeulKUClKUHkulthXmyTLTcmQ9DmMrjvtH66FpKVD8Ca5s4lMm8OvGUIU91Yh264Kt8pRGwehO9A5t5+ypCx7wK6Y1STjpwYMXvHtQorWyJaDa5ikjb20braUfeU84+CBQXaSpKkhSVBQPUKSdwfeKrxrDp7wk2XI15jqxbsft10kHx1o+UuNOTD5rMZo7uk+Z5Tv51t3DXmqs54bsfnyHOeZBbNslH9NnZIP3o5P41o3E7wxTtdskxm8WG72+0TYKHYs6TKQtZcjkhaAlKR1UlRc7/a91BEOR8ceB4PZTjehGmUViI0ORuRNaEON8Qy2edQPqpST6ioIuuqXEpxD3Zdmgzchu7Dp62qwsKYioHlzhvYbD7Sz8TVwcN4M9CdOG2bjnM8ZDNR7RcvspESMD6hkKH9pRHuqRZmvvDtp5bRaGc6xe3x2B7NvtCQoJ+DbSeWg1Pg90p1O0k00vFl1BRAjsTZaJ0KCzJ8d6Mso5XfEKRye1yt7cqj1Ct+9TfnGNMZlpvfMWkIQtFyhOxgF9gtSfYP3KCT91QSzxw6NXDM7Tjtkav8AcF3GY3EEoxBHaZK1BPOrxCCUjffoN6sqdwSOxB2oOeHB1kj+K8ST2LzFlCLtFehLQrp+XZJWkn3+w4P2q6JbBTfrXNXVBv8AyU8ecq6x0FDEa9x7whKRsC26UulI93tFP410nirQ60C2oKQR0UOxHkaDEXFroSKjjUXDbZnmn91xK7pHyecyUJc26suDqhwehSrY1LExjmQelald0NRmHZD60ttNJK1rWdglIG5JPoBQci8lx66Ynl1xxu9MFmfAfUw8kjbcg9FD3EbEe41iu42Paro8VGk6MqxxrVHFktyZUSMkzEx/bEuLtul1JHcoB/d+Bql1Bc7RHUhzVrhwy7R/JnzIvMOyPphOuHdcuOlBKQd+60KSgfqkVpPEFkTmU8LWjd5fXzSXI77Uk77/AJZttptz+0k1D2kGZJwDW/G8qfcKIkSYkS/RTC/YcCh5jY7kfo1m8+yOzSNMmMJtt2Ymt2LJ7kuCtpRUl6G9yLQ4k7dQVhf4igi2p94O7Gq68TsK4cpKLTCkSyryCinwgPvDqvwqAqu7wO4qYeJZDmL7WyrhJRBYJHdtoEqI/bWoH9UUFx2rzbLfcbZbpk1tiXcnFtQ2lHq8pDZcUE/BKSfurZ0/RFVJ4rMpfwy6aSZJFWUvQMmD5G+26PDKVA+7ZRq2bDjbsdDrSgptQCkqHYg9R/Cg+lKUoFKUoFKUoFKUoFKUoFfxXRJr+147lOZt1pk3B/fwo7S31/BKSo/wFBWvG9VJGRfyiGX4W1LUq1wLD8iba39nx2HELWdvXd9Y39BUmZxj8TJ8SumOT0BUa4xXIrgPbZY23+47H7q516LaiuWnjJtOaT5JLV0vDrUpxZ6FuUpSAVH0BWhX7NdL7o2FFXnQce73aJuP5LPsVxQpEuDIXGdChseZB23+/ofvqZ8nufzVwEYNYm18jl4vUua4AfptsrcR1/aLZ+6vdxf4eLBri1kUdrlj36MH1kDp46DyL3PqQEmovzbIUXLDcHx+M4FMWi0qCwPJ559bi/4eH+FBpdSRovpVO1U1ARAIcZs0PleuUpI+ijfo2n9NexA9BufLrpmN47dssyuBjljjGRPnOhppHlv5qJ8kgbkn0FdH9LtOrTpvgcTGbXs4oHxZcsjZUl4gBSz6DoAB5ACgrLxE3NiPxEYLhlrSmPbLGICWorXRDSnJCegHqEoT+NdCYcYCU7/1iv7zXK/UTIBknF5OuqFhTX84o8dvbtytPttDb3HkJ++usEVA8dw/pq/voPc02Et1omsF+/m5olld65+RUe1v8ivRakFCT+8tNb/2bqvfF7djbuF+9shW3y6RHhH3hTnPt/8ADoIH4FbEZmrGRZC6jmEC1pYCvRx5wHf91tdW71kydzDdAMwyZl9bD0K0vrZdQeVSHFJ5EKB8iFLBHvFQRwI2kM6YZVfOXYy7o3F39Q00Ff741aqRGjzIjkWWw1IYdSUONOoC0LSe4IPQj3UHHWz6m6tZLckwpGst0t7iwAly53d5ltSvTnCVAfFRA99bxkulfEVatMZ+odwzRVxx2G14zs635R8qSQSB7PIv2juR0q5epPBXo1nhem2i3vYhdF7nx7MAGFKPmqOr2NvcgoqouoXB5rjp1CnHHUrymxPD8ubI4pLjiAdx4sYkE7bb9OYD1oNPwLSDX/VjFXcjw1q73a3tyFRVPOXkNflAASNnHQSBuOorrJjtqRYcPtNjbUVIgQmYiVEkkhtAR3PftXOzhK121AxDP8f0PRj9tetdxuaw4iWw4xMjle63F82/XYJJCSny710lI3PKPPoKCiHHPlZm6lY/iDbu7NrgqmvI9HHj0P7iatjoliYwnh8xTHlNeG+1BQ/ITt/XO/lXP7SzVFdSCrUvj1mWz8+xJyBi2pHfdhtSUqH7ocrpRypQAhH0UjlHwHSgUpSg1y4f+knvj/hXmr03D/0m78f8K81B/Ujc1hb3lFnsTwjXF9Tbq0c6QEFXTtWaHeom1W/5yxf+zf40FMLIsO6jBaDuDKdI/FdbFn2/zAxvt+fH93wFaxjY3ztvf/pDv/jrZs+A+YI//Xj09KDJaPPKj2XIpCACppCFgHtuEqNRzPvl1ymS1PvsxyWsgLS0ejTXTfZKB0HxPWpC0m/5tZP/ANSn/UVUWW4/0SNv/m0/3Cgwr6UmWd0pP5Q+X+krYcG5RIlpSSPybZ5QOn1uta1IebTOUkrAIcO//eb1seCOBUmaEuJ28Nv2duv1qCTNPnQjE1jxgj+kudC8lHn6FJqM7v1y2V731+/yT7jUnaeOlGJLAeKP6S50D5R5+gSajC7nfLZhJ/r3O/XyT8KCddCf/V/kXT/2tupbxS5xbPkCrpMeQyxGjuuLcX2Tsk1EmhQA08yAD/paP8PcK3e6/wDNK9//AKPe/uoI9yrWPUrLra9Z5CoggLWrmRGbCC6nfoFbdxt5V6sW1r1MxuLCs6nIqra04lO8loLW23zDcA99gN61zB+t+dA3/Mn19fdXozncXCLvv+aV339T60F5oMxi42uPPiupdYfbS42tPZQI3Br0Vr2B9dLse2/6A1/qith86BXphSTGlJX9U9FD3V5qUG1ggpBB3B86/tY+0vKciKbV15DsD7qyFApSlAqJ+JTE/wCd/DHk8NtnxJUJgXKPsNyFMHnIHvKAtP7VSxXylRWp0B+E+gLbfbU0pJ7EKBG38aCmHAllakz8rwh5zdC0NXSOknsQfDWB9xBPwq0eq9kvmR6H5VZMYkSGL3JtjyYC4zvhOF8J5m0pXuOXdQCdyQOvWqG8OMhzBONW32F5SwDLl2JwKP0j7SAT97e/310jG5HvNBy1u3Chq5EsSsk1ay/HsVtiOrsnIbyqQvfvslCQrnV+ik7nyqHrrj+OLvrWOafTLzl091wNtyWIBjtvk+TMcczivcpRG/2RWc1JVqtnesF6i5E7kWU3SDcJEEK8Bx1KPDdUgpbSkciE7p7JAFbdhGhHFIuI5HxLEMix9mSnldkLdTbFPIP1VOkpUpH6JO3uoN1024RX7XLh5RrnnVn0+gsLRJbt785hM1zlPMOYqVyN9h9o+4Guk0SXGnwGJ0KQ3JjSG0vNPNKCkuIUOZKkkdwQQQffXN+zcAesF7d+VZPkuO2ound3xH3Jbx37ndCSCfia6A6e4zLwzSvH8Tn3QXORaoLcNcwN+GHeQbA8u526bDv5UFMuOuw/I9VMcyJpAQLhbFx1KA+k4y4Tv+66gfdVvNHL9/OPQ/E7yV8yn7Wxzq37rSgNqP7yDUD8dtpD+luLXzl3MS6rjc3oHWir/city4QLsbhwv2Zkq3MCTIhbegSvn/3lBYNxAUjtUX6188PQXM5bO4cas8hSSP1f/wBtSluC3Wh6twDc9E8ugoTup60SUgev5Mn/AAoK88LF6F+4Y7dCdWHnLU+9b1pV7XK2DzNpO/lyq7elVk4idIFab5x87WeORjd1cUuNyjpFd7qYPu80+7cfVNbBwhajIxvUpzDrk/yW3IkIS0VH2W5aU+wfdzJ3T8QkedW/1Awi053hFwxa+N7xpSNkuge2w4PouJ9Ck9f4UHLilZrLsXuuF5rccYvTQRMgvFpZA9lY7pWn9FQ2I+O3lWFoP002468hplsuOLUEoQO6lE7AD4kgV1T0cxFOD6RY9jASA7FiI8dQG3O8r2lq+JUTVA+HDDBmfEFZ2ZDJcg2wm5SRt0Ib+gk/Fe34V0xt6Fb8yuqj1PvNBTXj5va15Lh2PNObGNBkzVpB7KWpKUH+wqrv6a3QXfR/FrmFc3yi0xnCT5nwkg/xBrmhxa5U1lXFDeG460rYtLDVoQpPYlsKUv7wtxaf2a6DcPUwyuF/An1d1WZj+G4/woJWHalflB3TX6oFKUoFKUoFKUoFKUoP4o+zUc62XlVk4es2uaVcqmbNIIPpunl/8VSG6dk1DPEqpauFHUJKO/zM7t+8ig5ON8zSUBJKVIAAIOxG1dX9I83RqRoTjuVrcC5T8UNTNj1Ehv2HN/TdSeYe5QrlEr6Z+NW44INRRByO76ZXB/Zm4JNxt6VHoHkDZ1A/WQAr9gUEp8WeEDJ9CJV0YaCp1idE9ogbktnZDqR8QUn9k1zz6bb9NvWuvGTWiPe8fn2eV+YnR3IrnTslxJST+Brm3pfpxCvvENExXIHfBgQ5gbltrBBddT/7Mn1UVAg+iUqUdgDQWJ4WdJhjOIHOb1F2vF3aHyZDifajRT1HTyUvoT+jt61PGVXlnE9O75k8nbw7dBek7K+sUoJSn7zsPvrOQoiUtpQhtKEgAJSkbBIHYAeQqC+MbKE4/oIzjrLnLJv01DJSDsSy1s4s/vBofBRoKMY8647nlnffcLjirnGWtau6iX0Ek/fXZ+Kfyij5cxri1YTy5baVek+Of/jIrtBAXzNpVv3AP8KDJuK2aNVM44Z/haPWSAFD+k3cK29fDbJ/8VWvdP5KqacdT3/2XwtnfvcJaj/3KKCSeDWAInCzCkAAGZcZT59+y/D/AN3X24oNeb5oPiuPXWyWK2XVd0mOxnET3HEBCUNhYKSgjrufOsvwrspY4ScRCQBzokOHbzJkuGsVxO6w4ppHiNmlZJgMbMHp77rcONL8MNMqSgFSlKUlRG4IHRJoKzp/lFc2B9vTrGiPdNfH+NfdH8orlZ2J00saveme9UO5dxLZblkhUWwYnguHxnDyj5ttDAcA/SfdBIPvTy1irDiunmRT03LVHXyPAWr6bUG1TLlI2+yV8iWx8QpQ91BbnQfiJtWvXEbbol30osNuvMCHInRr424XJDRSkNkBRG53S4R1Jq4bzqY8dyQr6LSS4f2Rv/hVSeFqz8LFo1HWzpJk97yDL/m54uSbmxIZ2j8zficqS2hsdfD8ir0PerR5TI+SYLe5QOxat8hYPwaVQc9uG2N/OfjehXRY8QNzJ91Pn09vY/8AxRXR+uefA/GL/EQ/MV1LNhf3PvWpr/5a6GUClKUGu3H/ANJu/Ef3V5a9dyH/ABi4d/T+6oev/EnorjlzNum5tGflJcLa24TS5HhqB2PMUAgbUErjuKibVb/nJG/7N/ia3HENRcGzxLisRyeDdVtJC3WmF+22D0BUk9R16Vp2q3/OSL/2b/GgpPYngxmSXiCoJfcJA7/Xr853nEaRvaY0N3xWHeZTjhG3byA+Na5aZ6YF0mvuO8qg45yb9evtbfxIrX7jIclXB2Q85zOLVuVbd6CUdGrlNkXm/sOPr8E2xxZaB2TuOgO3rWlQLnETHZQp3lKUAEEe6to0VO19v5//ACl3/Co0bV9H4f4UH8muJXc3lJO4KyQfvrb9OSS9cPo7bI+PnWjuK/Lq+NbvpuEl64q5RzANjfz86CWNPF8uJL/KKT/SXOgU4Prfojaovup/+1sw7/8AtDnX7k/CpQ08Kv5pL25/+Uudg96/odKiq8yG4+UTHHV8g+UuDc799k+4mgnrQrb/ACd5AR/0tH+FbpeHG28RvRcWlIMF1I5jtuSOgrS9B3EO6bX5xtYWky0e0Dvv295r16sEjSueQdvba/1xQafg43v7u4/qT5e+vpqCS2+ypPQhkkHb3mozseU3exzvHiPpV05Sl0cwI399bpmd6YkWtm4OvtrbLO3M0NxufLp76C0mkmR3mW3YrZInLXEEMDwiBtsEdKmg783Wq/aKvNyJNgfaJKFwtwT0/q6sCr6VB/KUpQZiy/mnf1hWUrF2X807+sKylApSlApvsd/TrSlBza1JbOHfygUuQwORLWSxZKD26OloqP8AbVXSZX5xW3qf765z8W7YtnGE/MHTmjQJnT1BP/yV0Qgu+NbIr322W1/ikGghDWvie080JuSbE/Ck3bIH0CSu2Wzka8NKidlvOHokq6kDYk9+nTeBJX8ou4XVGFpSkJ36GRc+ZX38qRUZa12PGrN/KKXVzWkzl4nPmJmOuwlKUtcdTKQ39D2gElPKoD2th07islleWcKFt1GsWP6b6R27K7XOLLUi4y7jcIy2HFuhBTyL+lskhW/3UEi2n+UXiKloTfdLpDbBICnINxSpSRv1PKtPX4birh4HnWN6kYDb8xxSd8rtk5BUhRHKtCgdlIWn6qknoRVKOJvG+E3TnHr1hluw+ZBzwQkvQDAMjkaWsbtqWta/DKPUdTt261IP8nyLn/kDyEyQ58gN8V8k5t9vzSfE2/a23oN84yYAl8LE+QQCYdwivj3bueH/ALytR4HZ5d0evcAq6RruVAeniNg/+GpK4p2Q/wAJOXAgHlRHcHu2ktmoY4FHdsZzVnftcIih/wBysUFzkq/JisVeo/y+zzIBG/ylhxjb150FP+NZFB/JCvDLWWzzjuk7ig4uyW5FlyN9iO6tmRAlLbQ4g7KQtpwgEHyIKQfuro5olqlE1b0vaubnhtXuDyxrnHT5ObdHEj7KwCR6EKHlVGtd7AcZ4kcytIRytJuTj7PTbdtzZYP38xr7aF6nPaWauQ7w6tRtEvaHc2h13ZUR7YH2kHZQ+BHYmgsfxX6XC/YcnPLVH3udnRyykoHV6Lv395QTv8CfSqTV1qmxodytp3SzMhyWuo+k282tP8UqSfwNcx9U8IewLV+8YolKyy0/zQ1qHVbLntNn8FAfEUFq+DDDBb9PbnmUhrZ+7yPk7CiNj4DXf7lLO/7JqyWa5XEwDS6+ZhN5fDtsRb6UHstfZCP2llKfvrF6ZYs1iOmNhxttAR8ggtsrA/zm3M4fvWpR++q8cb2onye02bTG3P7LkEXK4hJ7ITuGUH4nmWR7kGgppOnSrnd5NznvKelSnlyHnVd1rWoqUo/Ekmur/DnujhY0/Qe4srPf4qrkso7IUfQGuuOhrQjcPeEx9tgizsDb4jf/ABoJXZO6e9fWvix9AV9qBSlKBSlKBSlKBSlKD4vH2DUX6y21V60Py+0oSFKkWmQkJPnsgq/8NSe/9E1rF5YalRnYr4/JPJU05+qocp/gTQcYEK5m0q9Ug/wrM4pktyw7OLVlNoWUzbZKRKa/SKTuUn3Ebj76/OUWh7H83vFikt+G7BmvR1I+zyrIA/DasTQdd8cyG25pglryqzrC4VyioktbHfl5h1Sfek7j7qrppNa7vc+LjUSHNkldkxy5yZcKH4SEhuTLWoeJuBuo+H4g9onbcbdq83A7nHzhh1909myOZ63Oi4QkKP8AUudHEj4LG/uBFSRpXHbicWmtNtI9tbtqlj3hcdRP8VCgmONGCU7kVz04w81Tk3EEuwxXQuHjscQfZO4L6jzun4gkI/YFXy1MzWDpppNesynFG0COVMNqP5189G0D13UR09Aa5J3CfLut3lXS4PKely3lvvOKO5UtRJJ3+JoNy0YxRWa694rjpSSy9PbdfI+q02fEUfh7I/GuucFQV1CQlJ6hI8vdXPzgfxQzNRL9mb7W7VtiphR1kf1rx3V/YSfxroFb/oig97x2a79Nqphx0Emy4V6fLJf+yRVznyfC61TTjlb3xbDXgPo3CUk/eyjagnLhj2/4J2G7f9Gd/wBsuvRrRoNiOuVvtMTK511iotbjjjBgOJQSVgA824PpWN4VX0yOEjEyDvyCS2fdtJdFTJQVKX/J86Rkfk8lytB9S82f8K8q/wCT00xUDyZllKfj4R/wq39KCv2ivCfimiWpTuZWTKLzcpDkB2B8nmttpQEuKQoq3T13Hhj8TUu6hb/5JMo5e/zVJ2/7s1slYnKI/wAqwa9Rdty7b5CAPi0qgovwLcv+W2779/mM7fvpq/1c8+B+SWOIh6Gru9YX9/ihTX/nXQygUpUM3nO5eb8RbekONSVMW+0s/L8jnMq2UoAjliII7cxUnmPfbcetB9tfs+d010hv2UxmVOS2mwxH5dvZdc9lKjv5AneuUsNxyVkHyqYvxXHXVOOKI+ko7kn8TXSbjRATwyXpIAA+URdgPL265qxFck4LJ22J6/caCznCdkKcf1+Ra2o6HGr3GVEWdyC0UnxAofu7be+rO6rkfzki/wDZv8aohp5lsnE87byW1qaVNt0WTIZDg5k8waVtuPMV+so4gtUsumJkXW/lBSnlCYyEtAJ37eyP76DW3x/TZH/Wr/1jWPkfnleVbUMgtLqd5eLw1kjcqacU2SfM15Lr8wy7M/MttvfhvtLQDzveIkg9KDadFzteshP/AOUO96jBtXVPwqTtGf8A0vkJ/wDyh3v91RYlXUUHycV+XV8a3vTQ7u3P/wB3/wCKo/cV+WX8a33TP/lFz/8Ad/40Et6eNlWJOENFX9Jc6htavP8ARIFQ7lnW8S/+1uf3Cpi09a58ScPg8/8ASXOvgc/1vXmFQ5lf/piYP/5tz+4UE/cOo20kvX/bB/eKy2rH/qquH67X+uKxXDsP/uivJ9Zg/vFZXVj/ANVU/wDXa/1xQVtT9I9fxFfh+5vnHlWspR4IWVg7dQSd6/afpbdfga8D/wCbX99Bd/QT/kmM/wDYB/s6sUr6VVIxDNU6d6RW/MFQhNMC1pUiMXPD8VRSAE82x27+lao5xzZhDvgVOwSzrgrG4ZbkOJcA/XJI3/ZoLw70ryWi6Qb3jsG8259EiJMYRIadQdwpKhuNq9dBmLL+ad/WFZSsXZfzTv6wrKUClKUClKUHOvjU/wDxRq27/McL8eZ6ug9n/wCbtv8A+ys/7NNc9OLZz5z4wn4aSN0RoEPp6kn/AOeuiMJvwbZGZ+wy2j8EgUFXdWeCq0aq6zXvP5WfTrWu6LbWqIzAbcDfI0hv6RUCd+Tf761y0/ye+N2u+wrn/lOvLioshuQlHzcyAooUFAb83uq5lKCAdUeEvA9XNXTneU3q+IWqM1GXBhLQ0hQbBAPPsVAnepjxHEMdwTDYOK4pa2bbaoSORmO15eZUonqpRPUk9SazdKCJeJvb/gn5lv8A9Gb/ANsioI4GCoWjNNu3yyJ/s11N3FS+mPwkZaVHbnTGbHvKpLYqFuBpsjF8yeP1rhFSD8GV70Fy2urVeGeOhr3x+rQ2ryT0ewaDndxu4x836vWbK2myG7tA8B1fkXWTygfuFJqr9dDOMTFDf+H9+6stBUmxym5oIG5DSj4bgH7yD+zXPOgvzwk6jnMdJ3MOuT3PdMdCWkFR9p2Ionw1e8pO6T91YDiRwO1XHXLTS6yng2q5z27Q80NwXUB5JBHvHikH3EelVv0Fzten2vdhvS3FJgvvCBOSDsFMukJJPwUUq39AaujxFwE/PmktxGx8HNoTIUB3C9z/ALsUEzvzIdptEu63B0MxYrS5D7h6cqEgqUfwBrlPqTm0zUXVW95lMJBnyStlsncNMjo2ge4JAq7vGRnhxbRBrE4T3JOyN4sLCTsUxUbKcPwUeVP31z4oPw7/AMnc278iv7q7DaZsfJdLcZjbcvh2qKNv/dJP+Nci7JbXbzk1utDCCtyZKajhI7nmWAf4E12NsMREG3xoDauZEZpDCVeoQkJB/BNBtTH0BX2r4sfQr7UClKUClKUClKUClKUHye+hWt3RO6VDvWzODdNYG5N7pVQczOLjEVY7xDSbw01yxb8wmckgdPFHsO/eVJ3+BFQPXRPim07ObaNSpcJjxLrZCq4RuVO6loA/Ktj4pHN8UAedc7PKgkzh/wA4Xp/xC45e1ulEN6QIEwb7AsvEIO/uCuRX7NXkx8otf8oJmDTikoZuWIRbhzq6A+E8hrff4A/hXM/4Ej3jyqzeseqeSfM2nup2M3JUK45BiLtknSmwCoKaeAfSn0PMojfuAaDw8VuvMbVDK2MWxSWXcVtLhWH07gT5HYu7fYSOifXqarkTsNzQAAAAbADYD0rY8AxZ7NdULFirAVvPmNtLKe6W991q+5IUfuoOg3C7hhxDh6sqHmuSbdN7nJ3HXd3bkHwDYQfdzGrEQEEJHSoqzfKWNNdJLhlDMNtUe2IZAZJ2QhsuJQfuSgk/dUuW1bL8RuTGXzsupDjavtJUN0n8CKD6SRs0aqXxrwi9o/aZwG4jXZKSdv8AOIUP/DVtpQ2bquvFdbDceGy/OBHMYS2Jn7rgT/vKD7cGVwEzhcjRgoH5Fc5TG3puoOf7yrBVUvgQu4e07y6w8/WLcmpYTv28Vrl3/wDgVbSgUpSgV+HWkyGFx1fRdSWzv+kNv8a/dNyOo7jqKDnDw3yP5r8cEK1ufkwuZPtRHbp7ew+H5Ifwro9XNfUpKtNOPSZcwPAYjX+Pc0nfb8g4pKlHf9UuV0oCkuAOI+iocw+B60H9T9NP6w/vqnPCdeQ5xK6pQ7sr/jeY6p4Ff0iG31hY/to/Cri1QnX23ZBoPxZRNVMXaKIV1cMtI2Phrc7PsK9yu/3j0oJi40v/AMM16/7TF/2lc0EHZ4n3/wCFdBNf9QrHq/wXXTIMSU5IKXIq5kJI5noagvdQcA7Afa7Eda57FRB338zQbPjSgu5TE+tulf7JVYFR77nf/wD6KymJOk3uUD526X/slVilHy/+u4oNlQkEdd9tq+63GW7BLaU8hLi1tlKT0JAJ3rzNnp2+r/8AXlWKuXWafhQb7pjktjsV1vnztcmooftrrDRc32Us9k1HrCHJDnKyAfMqPZI9Sa+TUFcuW4sqDbKT7bh7D/8AbU36LaITtR5iLhOaet+JsL9t7blcmqHdKPd6q7D40ELuQpDTgcJQtJ6hQPQ1ncVvxx56Ut6Gp8P8v0Fgcu2/r8atHqxw1xHLcq96bw0MPNIHj2cq9h8AfSbJ7L93nVUpltfjSXGS04060sodjvJ5XGlDuCDQS7p1mFgXZXLdJc8KaHlueC5GS4SknfcEnr8KjzKFBV0lqHYy3COm3kK1gtSm3EuJS4haTulaOhB9QRX3ducyQnw5ja3XS4V+IB1USAOo9elBYrRHKMexvSGcL9eIkAy55QwH17FwjYnb4VsOpVyt9z0jnvW+dGlN87XtMOBY+mPSq9Yhh+QZTcza7LBM+WltTrgUrZtlPoSegJ7e81iLpaptqmPxXo78V1tXK/HWChSFD1FBlEfS8/xrwP8A5tf31jG50pkjlkKIHkv2q2HGMfvWYvSI9tXBSpkBTheWUkA+YHXeglHUZ4s8PGKJKylKyykjyP5M96r9dzzSUe5P+NS3qUb/AB8FtOMXm6WtRjALYjRGlBZCE8vMpRPbrUMvurcKecndI26/Gg6R8IUiRJ4VLQZD7jvhypLSPEUVcqA4dkjfsB5CpyqCODz/APCrbP8At0v/AGhqd6DMWX807+sKylYuy/mnf1hWUoFKUoFANzt69KV8ZcpqDb5E59xLbUdpTy1qOwSEgnc/hQc4NR1qzL+UDlx45Cw7k0WMjbr0aLQUP7Cq6TK/OK/WP99c2+HCO7nfGnAvzyCQmVLvrpP1SeZYB+9zb7q6RjoBQKUpQKUpQV+4zJ4h8LcqMVAGbcorAHrsouf7utM4KYRa0fu03b/lN2Unf18NCR/4q/XHfdwzpviVi5usu5uy+X1DTXL/AL+tp4T7Wq3cNljWpPKZrr8zqPtOFP8Au6CxUTfwhXzmo3Qa+0QHwwa/UpI8MkqCR5qJ6D30Ea5rYI+R4pdcflhPgXCK7FWSN+ULSU7/AHb7/dXI+dCkW26SbdLbU2/GdUw4hXdKkkgg/hXUvTXNXtRLNk+RJdK7cm/yoVuHowyQgfioKP3iqGcTeKnFuJG98jXJGunJc2em2/ib8/8A8RLlBEHXslRST0CgdiPfXQLN8mTmegeh+UEgvS8qsy3NvquhDqVj7iCK5+1YEZzKtfBDhBhONqm2XNlyGEuDcAtoW8AR5jd9NBjOK/NHMu4lLvFbeK4NkCbXGAPQFI5nFbeRKyQf1BUI19502VcrpJuM55T8qS6t951Xda1qKlKPxJJr4UEy8LmL/wA5uJeyOONc8a0pXc3TtuAUDZvf4rIFdP7UkhCap/wXYIu04HcM3msFEi9O+DGKh1+TNnuPcpe/7lXHtiNkigzjI9ivrX4bGya/dApSlApSlApSlApSlB/FDcVip7XMk1lq8slvmTQaFdY+4UCkEHoQfOuZevemjmmurkuJGYKLNcCqZblgeyEE+018UKO23oUnzro1ds5tCNckaYuDluL1m+d2nObooB0oU38QnlUPUE+laLrRphC1N06lWJ0NtXBol+3ylD8y8B03P2VfRI9D7qDmdW1yb+LhotAx6Q5u9abu69GBP9VIaBWB7gtgH4uVgbvabjYb9Ls13iORJ0N1TL7Dg2KFjuP/ANvmCDXioFWa4L8TFy1Su2Wvt7tWmIGGSR2eeJG4PuQlY/bqsvnXQbhExj5j4f49ycb5X7zLcmnfuUDZtH3FKAfvoNi4qbgzbOEjIUO7EznY8JKfUrcG/wDAVu/Ctmv89+F/HJj7xdm29s2uWVHdRWyeUE/FPKfgagvjmvIjaUYrYG3NlzLouQ4j1Q20dj+8oVif5PzL1s5DluCvO/k5DDd1joJ+ug+G6f3S1QXrkjdBqMNVbML/AKV5JZwnmVKtz6EDbfdYQSn+0E1J7p3Qa1q7IGxOwIHXagpPwM335BrNfMedXyi42vnSn7TjLgP+qpyr81zSwKSnSnjtiR3j4MSLfHYClK6DwHypsKPu5Vg10t69j3HQ0ClKUClKUFEeOfFPkepGPZe21szc4SoLy9u7jJ3A/cVVrtD8s/ntw9YpkC3PEfcgpjyFb93mt2nP7SDWncWOFry/hsuj8VnxJtlcRdGtk7qKUdHAPT2FEn9Wos4Fs5S/aMh08lP7rYWLrCST3QrZDoHwV4Z2/SNBcStI1X00s2q+mc3FLts0tf5WJLCd1RngDyrHu67EeYJrd6UHKlD2oPDzrBKgPtfJprB8ORGdHNGnsH1HZaFDse4+NbndNJ9Pte7a9kekL8bG8uSkuzcTlLCWnldyphXkD7unrtV29YtGcZ1hw5VtuyExbmwkmBc0J3cjq9D9pB801zezjAs50cz8W+8tSLdNZX4kO4RVqSh5IPRbTg/iO47Gg06JjV/xLPJ1kyW0yrZPagykrYkoKT+aV1HqPeK1lX0T8P8Ayq12NcQeOZjZkYtrvj7V1a8JUdnIorQEpgKTykq26nofpD8DWt5nws3B6xryzR6/Rc0sC0laWmVgSmx0PLt9YgeXQ+6ghNtQ93asdPO8sn3VkpcSZbZzsG4RX4sprdLjD6ChaD6FJ6isXLO7+/uoJQ4f9PIGpmpjlovsp0Wu2sfK1xm+hf8AaACCfIdep71ZnX/Mr5pVpnZncFVHtw+U/Jg0hhBQGwgkJAIIFQvwdrCNY78jbfmtm+/wcTVgNddMLrqnhtvs1qmxYq48ovrXIJAI5SNht8aCKdCta9RM51hZsOR3Np6AWHFlCY7aCohO46pSDXv4tsTsUbE7fmMWEhi8OS0xXZDXs+MgpJ9sDuRt0Pevdo5w85Hpzqi1k1xu1uksBpbam2Coq3KdhtuK+3GGop0hs4BOxuY3Hr+TVQU3belKG6Xtuu2yld62bFsfvWTZHFx+1oS7cJB6qVsEsI81KPuFYKwvWVE5v56kyWGAr2lR2Q4oD3AkDep6tOT6eTtP5GP4ppnl81h07KuMOOVPl0dll1IJ5hv27e6g3HIccmaT6fWC1YnImsGVcUC63KNF8V14kdOb7KSegrxWXAH9WNI0XW/SJDWQNPvNw7rJjeC4+0lRCUup+snyCu9azo9qFm2O5GrGr/Z79c7O7KVHSt+OtciI4BvsQev0diU+XerBvZ/g8Vx5mRllmZWwvw3ULloSW1dfZI36HoenuoKO5dh15xW/PWy6wVRpTfUo7pcT9tB+sk1+sBvMrHsrbu7SPFYQlTchpKgFKQfQfECrkZHBwDU+yzLSblb7jIhoU4HYT6VvxVeoI7dRtsehqlbqseRdHFM3WdDWhakKKogcCtjt1CVD0oJtzXBb3fLS+G7Hzz40f50Tc0835U7DeOOm3KE9AN+4386rVcC18uWphW6T129D6VKMDVDNbeFNQtRm346gU+DNaUBynptsUnbp76jqbZXEoemN3C3PJBKyluQObv5AgE0HQ7g7/wDwr23/ALbK/wBoanmoG4ONzwq20/8A89K/2hqeuU96DL2X807+sKylYuy/mnf1hWUoFKUoFRNxLZX/ADR4Ysnltu8kmcyLYx12JU8eRRHvCCtX7NSzVIuOnOBIv+PafRHuZMNtVzmISf6xe6Gkn3hIWfg4KD1cCWKlU3K82dQQlKGrXHJHQ7nxFkfgB99XTqJ+G3CVYLw4Y/bpDXhzZrZucof6R7ZQH3I5B8d6ligUpSgUpTr2Hc9BQUH45778v1jsOOsr5hbrX4ik7/RcecJ/1UN1azSeyiwaUY1Z+XlVGtrCVp9FlAUr+0pVUez98arcdsyK0fFiyb41b0qT1HgMFLZV8OVBNdC7S2NgQnb3DyoNmighHWo34ic0VgXDXleQx3A3LEMxIhP+eePho/iqpIZ9lFVD4/ssTC0uxrDm3NnrncFTXEerTCdv9otFB9+C2Y1K4Y5EBB3XBvEhCzvuTzgLG/3GtE42sS8fHMfzNhHtw31wJBA+o4OZBPuCkEft19OA6+JVa83xhSuocj3FI377pLR2/cH41NuuuKnL9C8nsjbfPIVDVIjjb+ta/KI/img5fV713ie5i7GPqe/oDMtyahoD+tcQ2hSif1WkD8fWvACFAKT2I3HwpQK3LS7T246malwcYhBaGFnxZslI3+TsJI51/HqEj1JFapChyrjcWIEGO5IkvuBpplpPMpxROwAHrXRHQTSSPpjgSGZTbbl/n8r1xfHXlVt7LKT9lG/3kk0Ev4xaLdZLJEtkBhuJb4TKWWm0/RabQnYfgB1NbPhF9hZVhluyO3f8knNF1onrunmUkH7+Xf76gLiZ1F/yd6CyYcGR4V5v5Nuicp2U2gj8s4PTZG4B9VAedSXwxq8ThJ0+Vtt/xK0APQbqoJfSPZr+1/B2r+0ClKUClKUClKUClKUCvm4Bymvoe1ed5e29Bzd4nc4u2Fcfqcnti95FljQFtoJ2DiCyCtB9ykqUk/GrlWy82vLcRt2TWV4PwLjHTJYX+iodj6EHcEeRBFUb42IDkXiynTF/Qm2yG6j9lvkP8U1vPBrqukePpJfJIAWVyrMtZ+t3dYHx+mkevN60GwcSeiH887UvMcZig5FCb/LMIHWeyny97iR29R09N6PEEKKVAgg7EEbEH0rrjNjEdR91U34mNDhFVJ1IxOIQ2Tz3aE0noj1kJA8vtD383rQVXSlxaghlJU4rohI81HsPx2rrHgNiaxzTyw2FhOzcC3sR0j9VArlzhENNw1OxyCv6L10ioV8PGTv/AArrXHaCCUIHQHlH3UFHOOW+fK9W8dx9K+lutJfUnfzfc3H8Gq07g+vS7Pxd422F8jdwbkwXDv3CmVLA/eaTWK4ob2L5xT5StC+dqG41BbPubaTuP3lLrXNEbibVxH4PNCuXa9RmyfctwNn+CzQdgArmbrC3RG6TWVYVzJryXBvmQaDnrxbY67Y9bIWTREcibpFQ4Fjpu+wQk/2fCq+OnGUtZtpLj2VtOBfzjAaecV/pNuVz+2lVV74sMRN90Xcu7DRVKsj6ZYKR18I+w59wBCj+pX64H82Tc9M7vg0l3eTZ5PyphKjuSw9329yVgj76C1Xc7Coh1L4mtHdLHHod9ydufdmuirTaQJMgH0VseVv9sitL42NRsk0/4eWWsXlvQJd7nptzs1klLjLPhrWsIUPoqVyhO467FW3XrVWtBuDjINXsVh5zkeRosmPTitcdMdHyiXKAUUlex9lAKkqG6tydiaDccv8A5RHKHpyk4NglpgQwdkvXp1chxY9SltSEpPu5lfGp24aOKuFrfIlYzkNri2XKYzXyhDUZwqYmtD6SmubqlSem6ST06g9Dt6EaD8POgGm1xzS5YT88tWpnxpMy4M/OMhQKgno2r2O6h5dB3Owqm+g9zGU/yiFnv+n9gVZbXJuz8sW9o7iLCKVeIDt0A5T1Hbc7DyoOpUqLHmwXoctlL0d9tTTrSuy0KBCkn3EEiuaURc7hu4yuR1TphWu4cizt1kQHh39Ny2sH3Ee6umSd+Ub99qqdxr6Wm8YjC1OtUbmlWpIiXIJT1XGUr2Fn9RZIPuWT9WgtbGkx5kJmXEeQ+w8hLjTqDulaFDdKh7iCD99fWq08HWqn87dL14NdZHNd8eSENFZ9p6IT7B95Qd0n3bVZagVreb4FiuouKu49ltqanxF9Uk9HGVeS0KHVKveK2SlBzW1r4Ysu0tfevFoQ9fsY5txMZRu7GHo8kdv1h0PuqJsUzXKsHvCbpit7lW2QO/gq9hfuUk9FD4iuwC0IdaU24hK0KBSpKhuCD5EedVl1g4PcXzByRfcCdZx28r3WqJy/0OQr4Dq2T6jp7qCComu2nmpENu065YNGdf25E361o5HUfpKA9oevQke6sXf+FuLk0By/6KZtbcng8vMID7qUSUfo79t/iE1Fucac5npzfFWrL7FJtzu+zbqhzNPD1QsdFf3+6sLaL3eLBc0XCyXOXbpaDuHorpbV+I7/AANBLuhVsyfSvVHLZOU41cIMmHZHXksvtFIc5VpPsnsR8KkrCOJaZkWaw7JcsbQkTFoYbMVRJCyepO/ltWm4txYZVGgi059ZYOWW5SeRa3Uhp/lPQ9R7JJHuFZyBZeHXUG5MXDDMrmYBf0uBxuJM6N846+zzHbbf0NBaDfY9B51XPjHcI0nsaftXP/dqrbsjicSePwm5NmXj2TwuXo/BjBTrn6WxUAfuqs2quZ59lcxNt1AhPxGmV8zcJyOY4QvqOZO/n1PrQQnzVYnEr3drHwPyZllukq3yTkYbL0V0tr5SkEjcddulQvbcJul6uCo9ufhJG3MhUuQlnmH31L8K0zbdwtScQeetZnuXhM9Dny5BaKAnl2J777jttQbnohJkyvmmZLlvyZD97kuuvPuFa1qMQbkk9TUUZk7koy/Lg1ZLQtAuyeVS4EdRUOZzqSU7k+89a2LTjUO24ULaxebfOdXFuLshxUJCXEFKmPDHKd/X18qxd4haR3u43q6O3HLGHbhL+VKbVFZASocx2TurqPa70Ei6CLu6s2zcXG3QIyAx7Co0ZpoqPMe5QAT09are2006L0tcUuqbcUUuA/m/yh6n41s1kzGfiOSXC54m45DE1ZLodIUXEb7hKvd18q1hUZtTrziJ77SX1FTjYRvvud9vf1PnQea1QY0xiUuS6G+RH5I791+8elY2dDciuJS6UK3G4KFbis2lDLaAhhvkSPU7k/E155UAzFoV8pDYT0KVDsPUevwoLNaV68QtK+Ddu2wUOSMlkSZaoCfBDjLJ5x7TvUbDqdvXarTaIZje8+4fsfy2+racuU9lxTqm0eGgqS4pI2A7dAK5kMpRFZSyx9Ad9+nP8anLQnX1elr0qDemJlws7jKGmIjTpCInKoqKkJPTrud6C5v+WFeETnmdRsPutltynAhF8iD5ZB93OpICm/2k1K9ovNpv9nYu1kuUW4wX08zUmK4HELHuIrC4lcLZl2EMXRuOHrfc46HQzJQCFIWnflUk9D8KrbqPCu/CxqFDzzAw45gt5k+Dc8fUolph09d2t/o7jcg+o2PQ0FuqVisZyK1ZbiFuyWySRIt89hL7Lg9D5H0IPQj3VlaDx3W5wbLYpl4ub4YhQ2FyH3T9RCElSj+Arm1hsGbxE8ZInXJpaodwuCrjMT1IZhtdQ3v5DlCGx71CrBcaeqfzPhsXTG0yQJ13AfuPIfabipPsoPpzqH4JrL8Gul/81dLXs7ubHLc8iCTH5h1bhpPsbfrndfwCPSgsuAEpASkJA7ADYD4VEOrHExpXo5eWbJlFylyru4gOKt1sZ8Z1lB7Kc3ICN/IE7kdQKkLM8ptuEaf3jLrwsJg2uI5Kd3O3MEjon4qOyfvrldpzb8O124gr3ddZdRBjHzotctDqiEqkPrVslpK1DlQlKfXYdABQdFNPOJfRnUx9uHYMwjxrkvom3XQGI+o+iQvYL/ZJres5ymJhGml+y+aU+DaoD0whR2CyhBKU7/pK5Uj41z11H4Fc9sEE3nTi7xs0tZT4rbKOVmWU9wUjfkc+KTWs6X8TGpmkV+GGagsy79jKFiPcbDf2i49HbJ9rw/EHMCB1CFbpOwA2FBaThc4p8x1uzGXimRYhbmlw4Kpjt3t7q0IACglKVNK5vaUVDqFeR6VYXUXKWcJ0oyHK3nA383QXXmyf85y7Nj98pry4RgGnOLvzMlwTGbZalX1pl59+C14aZCACpB5d9kj2ydkgfwFQPxv5sLXpjaMGjPbSbzJ+UvpSeoYZ9fcpZA+6gg3hKx12+63TMmloK02uKt0rPXZ98lI/s+KfuroHbG9kCq1cJuI/MejCLy80Uyr3IVKJI6+En2Gx8CAVD9erPW9vZsdKDJb8re9c6OPK9fLtfrPZ0r5kW+zIVt6KdcWT/BtNdE31cqK5XcWV1N14ucr2XztxFR4iD7ksIJH7ylUGb4Mr781cTDVuWvZu7W2RF5d+608rifwCV/jV/wCewl5Cmlj2VgoV8D0P99ctdGL4cb4hMNvIVyhq6stqVvtslw+Eo/g4a6qTE+wrby7UHIvL7QbDqDfLIUcghT32Ep222SlwhP8AZ2rCkgDcnYVJXEHFRD4oM3YaACBcioAe9psn+JNb7w26Jfzvu7ecZPF3sUN3+iRnU7pmvJPcg920nv6kbdgaCQ+GPRJVjhs6h5TEUm6yEb22K6nYxWlD86ofbUO3ok79zVpXZlusdllXm8TGYUCG0Xn5DytkNoSOpJr8Q46W2ytZSlKQVFSugAHUknyFUg4mde/593ZzBsRln+bEJ3+kSWj0uTyT397ST9H1PtelBoGu2rUjVrVV++oS4zZoSTGtkZfdDIO5WoeSln2j6eyOu29dKuHu3u2fhhwS3PghxqzMbj03BV/jXJ/E8fk5ZndmxiIgreuc1qIlI8wtQB/hvXZOzRo1ttUW2Q+kaKyiO0NtvYQkJT/ACgz6TvX6r5NHcV9aBSlKBSlKBSlKBSlKD+HtXglL5d6957VjZu4BoKOceuJuOoxXPGG90teJaZKx9Xcl1rf4nxR91Uztlyn2a9RLvapTkWdEeS/HfbOym1pO4IrrFqfhVr1E06uuIXdKQzNaIbeI3LDo6ocHvSrY+8bjzrlPkmPXTE8tuON3uOWJ8B9TDyPLceY9QRsQfMEGg6WaL6qWvWPTFq8teGxeYgSxdYQ/qntvppH2F9wfLqOm1bZMgoWlbbjaVoUClSVDcKB6EEeYrmJpnqTkelefR8oxx4c6R4cmI4fyUtknq2senmD3B6jzB6V6eahYrqvhDOS4xKCknZEqG4R40N3bctuD+49lDqKCjuqenDWjXEjj93hNFGNzLixOiK67MBLyS6yT+j1I/R+FdFWFoUkPI6oV7aT7j1H8KiTiA0yRqNoZdrUwxz3SGhU63kdw6gdU/tI5ht5nati0byk5jw+4vf3HOeQ5b0syeu5S+2PDcSfeFJIoOZuoc1Vy1dymetXMXrxLXv7vHXt/DavDi875rzqy3Pm5Pks+PI5vTkdSrf8AhX4yPf8Anld9+/y5/ff/AKxVYw9BuKDtlCVzIB9a+ktsKbJrB4hdPnbB7VeUbumXBZlAJ7r5mwrYe87168dyayZnirN9sExMmI4pbZI6KacQopW2sfVWlQIIPpQavk1qi3W0zLZNaS5GlsrYdQobgpUCCD+NUR0evsrQ/i6Ztt2cW3ETMVZp5PTmZcUAhw/eW1e7c10IusforpVJuLnBVRr3bs+htHwpKRAnFI+itO5bWfTcbp+IoLXcQOkzes+hdyw9p9li5JUiZbZDv0ESW9+XmI7JUlSkE+QXv5VziOB8VdhhK00jWLUePbUOqItsFD6om5PVaVI9gp368wO1dEOG3UpOpWg9tly5AcvNrAt1xBPtFaAOVw/ro5VfiPKsTxYas3rSPQFy64ysM3q5y0W6LJKAr5NzJKluAHpzBIPLv50GByfW/EMC4ZLdj2vBWzlVwsnyG441CW3ImOczZbKiEqKUBSevMpQ6+p6VRrFOIC66XKfjaN43bceS/sl64XBpNyuEtI7BxxaQhKfPlbQkfE9a2LRXhk1B4gJrmZXm7OW2wSJKvlF7mqL8ma4FbL8JJO61b9CpRA36VaWfcOGDhBsi4sG3xrvlyW/zAKZdyeV1/OLPssJ8jty9PI0GV4WeKRetKpWJZbCiwcshs/KELigpZnMggKUlJJ5VpJG6e2xBG3arH3S2QL1ZJlnukZEmDMZXHkMrG4WhQ2UD9xrmJwvKvOb8e1vyuw2hu2Rflkq6To8MHwYkZaFgo/VKlpA9T8K6jeVBzMu8HJ+FzikQ/E8R5mG740ZROybhAcOxQT5nl9k+ikg+ddHMWyWz5jhtuyewSkybdcGUvsuA9QD3SfRQO4I9RUZ8RejDGrumik29ptOS2sKetjx6eJ9phR+yvbp6K2qr3C5re9pjmjunmaPORbBOklsGT0+bZe/KSrf6KFHor0OyvWg6CUr+AggEEEHqCDvvX9oFKUoMfe7DZcksztpv9qiXKC6Nlx5TQcSfx7fdVV9TOCOyXJTty0yu3zS+d1fNk9SnGCfRDnVSPv3Hwq3FKDklnOlGoGnE5TGW41Mht77IlpT4jDn6rid0n++tM6Eeors1LhxJ8JyHOjMyY7g5VsvIC0LHoUnoagrPOEXSbMPFlWuA9jNwXufGth/JE/pNK6fhtQUFxXUzPcJeC8Yym4wUA7lgOFbSvihW4NTTZeLebNhi26lYNZ8jiqGy3Wmw24R70qBSfu2r4ZtwZap44px/GzDymINyBFV4T+3vbV3PwNQNfMayHGZyoeRWSfa30nYomMKb6+4nofuNBZVKeEjUZQKHJuFXB3ulW7CAo/vN7fhXwuHCAq6xPlmn2otpvEVXtNpfI6/ttkg/hVXdq9tsvN2ssoSbPdJlveB38SK8ppX4pIoJOv3DRrJYQtX82DcGh9e3vpd3/Z3Cv4VHF0xPKbK4W7xjl1hKHlIirR/eKknHeJnWHHeRAyf5zZR08G5MpeG36w2V/GpUsnGxL8JMfLNP4k1B+m5BlFBPv5Fgj+NBUlR5DsoFJ9D0r+cw91Xii8QnDNk2385sKdguK+kZVpZkAb/pIFZeIrgryDYtysVZWr6j7bkdX3jcUFBub4U5hvtuK6NwtMeFSWQuAcKe3O43m9P4rrabdp7oZaUc9uhYE15hRXHWR96lE0HNOyYrk2STExbBYLjcXVdAmNHUv8SBsKsrpLwjXqRdYt81LLUOC2oOC0tLC3XtuoDih0Sn1A3Pwq2Cso06scbwU5hisFlP1G5jSUj7k1qV74htGrEhZezu3y3E/wBVACn1n4ACgmCwMsx4Jjx2ktMthKEIQNglIGwAHpUDcaeR2i28PIx+U62q43ScyYrO45gG1c6l7eQA6b+pqPcn434UGE/EwLFXX319ETbqrkQn3htPU/eRVW8iyfN9V8+bm3qXLvd6mrSww0lPqfZbbQOiR7h99Bd3ggu02doDcrfJWpTFvuy2o+/klbaVkD3bk1Oud5pZdPdPbnl9/e5IcFoq5AfaeWeiG0+qlK2ArVdDdO29JdC7fYbg403N5VTbk8VAJS6obq3PokDbf3Gqa8ResFx1s1SiYbhaX5lhhyRHt7DAJNwkk8pe29OvKn0TufPoGJ07xnIeJjickXPIlKVEde+cLu6k+yxGB2Swj032CB26cx710pjx2IkRqLFZQywygNtNIGyUJA2AA9ABUZ6EaRQdINL2bQQ29epe0i6S09fEd2+gD9hA9kfefOtvzvKDhOml7yxNslXNdtiLkNworZccfWB7KAB16nbf0G5oKb8eOsDi5Vv0Wx50vLUpubeUNdSsk/kI3TzJ9oj9X1rVLzwBZo/pzar5jd+t5vr8ND8+wziUJbdKdyhp7rvtvtssDr9aoWs2l+sev0jLtSLPaXL1LYmeLPPiBDjzy91FtlKvpFKQPZ8gAK3bSvi11b0cuScXyxmVkFoiKDTtqvJU3LiAeTbqhzD3JXuO2xAoNXtOccRHDLkvzQ85erCgK3NrurZfhSAPNAVuhQ8uZB+Br1Zfmt/4teIbD4KschWm6y22rS+YJKg4OcrcfJV12SjmOxJ2CdtzXQLBtX9FeIvFFWdpduuDrqN5OOXtlHjtnbybVuFbddloPw2pgPDJpXppq8/qBh9skwpS4q4zUJbxdjxisjmW3zbqSSAB1J2G/rQS5BhR7ba41uiJDceM0hhseSUpSEj+Arm1rFfpeuPFy9bLQ4pyIZabLAI6hLTaiHHB94cV7+UVdDiQ1KTppoPcpkSQG7xcwbdbgPpBxYPM5+wjmV+A86q5wjYKZd9uGezGSWoqTBglfXdw7FxY+A2G/qTQXBxi0xbTZ4drgtBuNEZQw0hPYJSAB/dW8w2+VoVgLUx0T0rOTrlbrDYZV3u8xmHAiNKfkSHlcqG0JG5UT6UH6lqAFcfNXbobzr5mdy3JDt6lBJJ39lLqkp/gkV1bxXM4WeacQMyt0Z+NAuLa34qZA2WprmIQsjy5gN9vfXHu5y1T73MnrO6pD7jxPvUon/Gg+DMh2JIblMK5XWVBxB9FJO4P4iuxEJ9FxssOU0d0yGW1pPuUkH/GuOavoH4GutmO3Jm16J2u7z3UstRLI1IdcWdgkJYCiT+FBRd7CF64cb+Vx2PEbs6Lm4/cJCP6thrlaKQftKUgpH3nyq8FpssK122NbLZEaiQ4raWmWGkhKG0JGwAHwqMeF/CDaNIXcxnRi3dMtluXV3nT7aGVLUWkH8Srb3g1E/EzxEpJl6bafXAcnVm7XaMv6XkY7Sh5eS1D9UedBi+JbiHTevlOnGAzj81oUWrpc2FbfKyO7LZH9WD9I/WI27d6rUr6R48iXMaiRWVvPvLDbbSBupaidgkDzJJAoLI8GGCOX7WV/NJTW8HH2T4SiOipLoKUbe9KeZX3D1rotAO4FQroNpy3pjpDbcecSn5xc/pdxcT15pCwOYb+YSAEj9Unzqbbeg7CgzLP0a+tfhsbJr90ClKUClKUClKUClKUCvFLRuk17a+TqOZJoNOuLZBJqnXF7pGq6W1OqNijc0qE2Gbs0gdXGR9F73lG+x/R2+zV1rjG3SelalcojTrTjD7SHWnElC21jdKkkbEEeYIoOQtbhptqXlOlmatZJi0sIc28OTEdJLMtrfctuAdx6EdQeoqSeIHQGZp7d38nxiK4/ij6+ZSUjmVblE/QV/o/sq8uxqBqDqrpFrDiWsOJi52J8RrlHSkzrU8oeNFV6/pIJ7LHTyOxrU9O229Otfsu0sUA1arv/wDaexJPZKXDySWE/qrG4HfYqNc7sXym/wCGZVEyPGbm/brlFVzNPtH8UqHZST2KT0NW4XrMxrDgFrze0x2YGpmBum6rtyPo3CHtyygz5lKm+pR3Ty7DoQaCrOptsXZ9Z8rtriSks3eUAD9kuqUn+yoVqp7VNnE9b4L+rkbO7IsPWbLLezc4z47KUEhCx8Rsjceu9QnQdZOHS7fO3DNhEzm5im1NR9/e1u1/4KrxdNSpXDPxx5FbJ5dVguUPNXORHSDtGLw6vtj1SoHmA7g+ZAqTuDa6/LOFizsc25hSpUU+78qXP95UdcfeLofsGI5wy3+Vjvu2uQv9BY8Rv+0FUFvnnYtxtjM6DIbkxZDaXmX2lBSHEKG6VJI7ggg71GmouHwczwe541cEjwZjJQlZ/q1jqhY+Ctj8N6gjgt1sE22HRzJZe78dKnrG84r6bY9pcff1T1Un3cw8gKtVc426SdqCiHDnns7RjiMexrJl/JLdcHvmm5pcOyWXUqIad+AUSCfsrJ8qudxCaUnWPQm6YhGdbZuaVJmW51z6KZDZ3SlR8kqG6SffVWOK3TYocZ1FtUbb6Ma5hA+5t0/6hP6vqanvhU1fTqNpS3YLtICshsDaIz/MfakMbbNPe/oOVXvAPnQULY1F4jNLsce0Wiyr/j7aX3Nrc1D2lBSySpLTgSVFCiSfYJB33FZjEeGXIJbtuyLWvJI+nVkuctDDTt5XvcJ7iyBs2ydyD16rc25d9yNq6s+e+w39ap7xy6GS8wxVrVfHEPP3OyRizcoaSVeNDBKvEQnyU2SSdu6SfNIoLFaYaSYNpBihsOE2hMVCyFSZbp8SRLWOnM4vufcB0HkK3iqqcLvEEqdwxTLrqk69bYeLBMb+cMpshmc1t7CEq/rHk7BJSncn2ahTU7jyz6+ZQqBpNBasdpSvkZflRUyZso+pSd0oB8kgE+/yoOi3lVROLPh7VeI8nVPCoBXcGk895gMp3MhAH/KEgd1gD2h5jr3B3+XDLxe3HUHL29OdT48WLf3yU2+4sN+AmStI3LLrZ+i5sCQRsDsRsKuBQU34VeI5L7ULS3O5wDyQGbPc3lfnB5R3FHzHZCj3Hsnyq5FUj4muGR63SZmpOm8FSoaiZFztEdPtR1dy8yB9TzUkdUnqOnbK8OPFUy7Hh4FqjceR5OzNvvr6vZWOyW5Cj5+QX59j16kLj0r+AhQBSQQRuCDuCK/tApSlApSlA2B714bpZrRfISod6tkO4x1DYtSmUup/iK91KCDMr4SdF8mU49Gsb9hkL6+Jani2kH18M7p/hULZNwH3Rorcw/OY0lP1WbpHLavhzo6f2au5Sg5j5Dwqa3Y+VqOJfObSd/yltkIeBHrtuFfwqMrvhuXWB1Td7xi8W9Q7iVDcb/vFdha/K0IdQUOoStJ7hQ3BoOMJ6HY9DTfcbE711/ueB4Reio3fD7FOUruqRAaWfxKd61aVw+6KzFFT+m9jJP2GlN/6pFByo5U/ZT+FOVP2E/hXUlXDLoSs7nTi2/c++P7nKI4ZtCUHcacW373nz/e5QcttkfZT+Ar0w4U24SExrfEflOqOwbYbK1H7gK6pwNBdGra6HImm9gCh28WP4v8Ark1utssVjsrIZs9mt9vbHZEWOhoD7kgUHNjBeFnV7NnWnV2BVhgKI5pd3/I7D1Df0z+A+NXS0b4b8L0i5bm2VXnIVI5VXOSgDwt+4aR9Qe/v76mNxxDTSnXXEoQgFSlrOwSB3JJ7CqR8R/FQLyzLwHTCcsQV7sz72ySDIHYtMEdQk9ivuew9aD8cVXEYLy5M0twSYFW9Kizd7iyd/lCgerDZH1AR7RHc9O1b/wAKnD4rCrY1qLmUIoyKY1/QYbyfat7Kh9Ig9nVD70pO3cnbXeGHhkXbnoWpGo1v5ZKdnrVZ309WT3S+8k/W80o8u567bXE6k+pNA8ulc9OIjX/XvTjiyVco8aZj9mgpVGtdvkp8SHdI2/tOr2PKtSzseh5kbJHQirDt8WOFTuLCBpBavDkQXS5DfvZXs38uH0WUeqeiklXmrYCpjzXBcT1ExGRjGZ2SNdba93aeGym1eS0KHtIUPJQINBEPDzxG6aarwFWm3QoOLZU8tUiVZNktiS4QOZ1lQADu+w3H0ht1B71uWrmh+l+rFieczi0MsyWGlKRe46gxJjJA3KvE7FI23IVuOlUU114QM00mmO5fp89Ov2Nx1+OHGN/l1t2O4UsI25kj/OI7eYFapkPFpqtlnD89pfe5zcr5QtLb16TumXIjDuw5t0Vudt19CQOU77kkNtc4PM0dzCwXzSfLoOU4jcZiEx8ktkgNPQEFXVbqQdwUjuU+fdKe1dLLbCNus0S3mVIl/J2UM/KJK+d13lAHMs+ajtufjVeuDvRO46UaPru2QuSW77kXhy34KnFBENoD8mgo7eJsd1HuNwnpsd8pxUawN6caVOWK1SeXIr82uNG5D7Udns48fMdCUpPqSfKgq5xHagTNZuIhjGsZWqVbbc981WxLfVL7ylAOuj1BUAAfsoB86t3pziELDcGteNQQktwmQ2pxI/OL7rX96t/u2qtHClpqXZD+o11jnYc0W1hY7ns47/4Af1vQVcq1xttiRQZ63M8qBVN9XtTHuIfiHs3D/htxcaxMTuS7z45/5b4W6nOUju0jlIHqo79gN9y4u9cf5gYF/k+xuXyZHfGCJDrStlQoh6KVv3C19Up9AFHp7O8K8B+Ppm64XzI3G/YtNpLbavRbywgj90GgvDkaIGLaWTo9sYTFg2u1uJYZQNg2hto8o/AVx0HYV1m11vbdl4es0uDhICbRIaSR9txBbT/aWmuTI7UH6bZdkOJYYQVuuHkQkd1KPQD8TXSXVhUm547imhtjeUiZk3IxOdR3jWxhIMhZ/WACAPPmO3UVSbh8xmJlPENj8O4LQmHEcVcX+foClgc4393NyE+4GrHXbVhjEscyjXmQEuX3J1KsmHxHR1agsqI8cp7hKnApw+p5QPpUH54pNd0Yjb/8kGnr/wAklNMJj3KYwrZUNnlATGbI7LKduY9wOg6neqS195kyVcbi/PnSHJMqQ4p15507qcWo7qUT6kkmvhQKtNwnaOuXK8t6n5BGIhRFFNpZcT+fd7F/b7KeyT5q6+QNRvoXopcNUcmTPuLbsbF4bg+VSB7JkKHXwWz6n6yvIe+uh9ktcWBb41vgRm40SO2lplhpPKltCRsEgegoM/bWSSDW2wmtkA1h7bG2A6VscdvlTQfcDYV/aUoFKUoFKUoFKUoFKUoFfwjcV/aUGPlsBSTWpX2M+i3SXIqEqfSytTSVdisJJSD8TsK3lxIKaxExj64AJB3FBDOL3+1Z/pxEvLTTUiLOYLMuM4ApKHB7DzK0n0UFDY+W1VC164cJGIqk5hgkZ2Rj+5XKgJ3U5b/VSfNTX8U/DqN7gZqOH7i4ynAsgUWsNvs0XCO6sdIanvaS8P0SSoLHl0PkatC42lSOZJQ42tO4I2UlSSPwIIoOSte6z3i52C+xbzZ5rsOdFcDjL7R2Ug/+RG4I7EEg1bLWnhcYuCpWUaZspYmKJdkWTcJbd8yWD9VX6B6Hy27GosuJKgTnoU2M7GksrKHWXkFC0KHcEHqDQbzkWa267aNWnFmi8p+LcnZyGFoCW4CXEq52WSOpb35SAT05jt23rQKUoL68C12Dujd/tAUOaHeC8R6B1pG3+yNbzxfW0XbhMvrvLzG3SI08H05XOT/e1AnApe/AzrLcdUsASoTM1KSfpKbc5On3Ok/dVs9V7Kcm0QyuwpSVLlWp9KE/aWlPOgfepCaDlNaLtcrBf4d6s8tyJcITyZEeQ2dlNrSdwR94rqdpBqXB1f0dgZWwhDM3rGuEVP8AUyUgc4H6J+kn3HbyrlGAQNlDZQ6H41ZHg21LTh+srmJXOWlq05IgMAuK2S3LT+aV6DmG6N/hQXZyOyQbvaZdqucZEmHKbUy8ysbhaSNiKot4mTcNfEczcIPiOsR3CtrmOyZ8JZ2KFHtvt0PooA+YrobcIpO/s9fSoV1p0vjajYM5CbShq7xN3rfIV02Xt1bJ+yrsfQ7Ggn/EsqsubYVbspx6WmTbp7QdaWD1T6oUPJSTuCPUV675cbbZ8YuN2vC0ot0SM4/KUobgNJSSrcefTcVQHho1rmaR589geaFyNj06SWn0v9DbZW/L4nuQey/Lsr13vjl+Oxcz07vWLSXuWNd4DsNTqDvsHEEBQPp1BoOV+dZ3nnErqpb8Rw2xrZszThasGL29IbYiND+tWBskK26qWeg32Hvt1p/o/pNwj6anUXU24w7hlHJ0lqSFlDm24jwmz1K/Vffz3SBVVNO9Qcx4QdasmtV7wyJcLm5GMBbctamTslRU2804Ad21dyAPaGw3BFYeVK1k4stYTIeUZ77aSSvcs26zRx1UokkhtAHUkkqUfUmg/q8zmas8ZLeoMSDGx1p27NXR9TauVEGKwpKlvOrG25CEe0rzUrYdxV9dHeLbTvV7OZ+KMoeslz+UuC1tzVAC5Mg+ypB+q4R1LZ6+m/Yc7M5uGN2Rhem+msty528OoTc75ycrl7kJOwDae6YyVfm0d1H21b9Nt/1O4Zrto5w445qTfsjMLKZlxQ25aEkJMdK0KW34ax1LqOTdW3Qc2w+juoOqfeqi8QfCY3e3JWZ6WQmmbirmdm2JOyW5JPUrY36JWfNHY+WxrdOFrW2RnvDUnINQLrGjTbRNNqlXOW4lpEnonwlqUdhzq5gk+pAPc1YbcEAggjuCPOg58aK8UOT6XTU4ZqExPudhjr8DldSflltIOxSArqpI+weo8jV7sWyzHc1xpjIMWu8a5258ey+wrfY/ZUO6VDzSQDUcay8O2F6vRlz30fM+RpRytXeKgEr27JeR/WJ/BQ8j5VSy42TW3hbzwzYz0iDHcVypnRt3rfcEjyWCNif0VAKHlt3oOmdKrNpXxkYXlTTFrz9tGLXc7J+U7lUF4+oWerXwV0/SNWUjSo02G3LhyGpEdwBSHmVhaFg9iCOhoPrSlKBSlKBSlKBSlKBSlKBSleedPg2y3Oz7lNjw4jSSpyRIcDaEAdyVHpQeitezLOMW0/xd3IMtvEe2wW+gU4d1Oq+w2kdVq9w+/Ydar1qrxoYtj7b1q01jIyK5DdJuL4KITR9U9lO/dsn9I9qrpj2E608Tuc/PVxlSpMUK5XLxcAW4cRH2GkgbH3IQPjt1NBnNYuIzM9abwMLwmDPgWGS54LdujgrlXI79PE5fL9AdPUnrU4cPnCnEw5cXMtR47E3IE7ORbYdnGYB7hS/Jbo/dT5bnrUp6QaDYTo/bee0MG4Xt1HLIvEtI8VXqlA7No9w6+pNSVOnQrZbJFxuMtiJDjtl16Q+sIbaQO6lKPQCg9H4kn+NVO1s42LNppqvHxHFbGxkyYLhTe3w+Ww0r/MsqHQrHdRO48vWoh4k+M6bk/wAtwbSOY7CsagWZl+Tuh+aOxSx5ttHtzfSUO2wPWa9HOGi33zhstdj10tdkyGaUeLbZEX/lVvirSFIZ+WNkFwAkqABKRvtuobbBSXW3JsBvurjGpWk8yRbRc1pnyLa60Wn7ZOSoFSht7JSogLBSe+/QV0+0T1Ii6saGWDNGVt/KpDAantIP5mUj2XU/vAkeoIPnVTNSP5Pd5ll+4aV5eX+VJWm1XwAKV58qH0ADc9hzJA9VVCmhmu2bcNmo83HL/bZq7IqUW7zYJA5HWHR7JdaB+i4AB7lgAehAdXSAR1FQncuFTSGfrhbNTWrGIUyG8ZT9tjhKYcx/uh1be2ySlXtbJ2CjtuOlShh+Y43n2GwsqxO6s3K1TEczT7fcHzSod0qHYpPUVnFKShBWtSUpSNypR2AA7kmgw+WZRZsLwy45TkEsRrdAaLzzh7n0Sn1UTsAPU1zcdeyfiV4j3rhLS4yxIcCnAk7pt8JB2CQT0326D1Ud+wNbhxM62TNWc+ZwHDFuSsegyQ0ymONzc5W/Lzj1QD0R5d1em046J6XMac4OiK8lty8TOV64Pp67r8m0n7Ke3x3NBJON2SFaLTEtVsjJjw4rSWGWkjolCRsB/CsrlmWWfTzTm65ffV8sK3MF5SQdlOq7JbT+kpWwHx38q91ujbAEjpVN+OXUlci92rSu3P8A5CIlNzuYSfpOq3DKD+qndXuJoKtZvmN51A1BumYX93xJ9xeLqwPotp7IbT+ilICR7hV0uBGz/I9KcnyBSetwuiI6FbdeVlv2h8N1g1Q3410x4WLR8ycK+MIKeVyal6e4PQuOKA/soSfvoMVxkXs23hgnxgog3KfGhdPP2i7/ALmucdXY47L0UYziGPpX+flvy3E7+SEJSk/itdUnoNmwvIY2OSr0/IkT465loft7TkEJ8RKnVNg9VdAChLgJ79dvOvjmOWTcvyITpAUzDjtJiW+Dz8yIUZA2bZR7gANz5ncmtfr9tNOvvoYYbW664oJQ2hJUpRPYADuaD8VM2iugd41LnM3q8Jet2LNr9uR9FyXt3Qzv5eRX2Hlue0g6N8Lbskx8k1OjKaZ6OMWPfZS/e+R2H6A6nz27VbqFBaYjtRozDbLLSQhtptISlCQNgAB0AFBrk+VjWlulE25Iix7dZLJDU4iO0OVOyR7KB6qUrYepJJre8EM254RZrlcmwmZKhtSHkpHRKlpCtvu3Aql2uuobmrOsdj0bxB75TaEXRqPJdZO4mSOYBWxHdDaefb1UCfKugNqt7UOGzFZ/NsoS0g/opASP4CgyENjlSOlZFI2FfhpHKntX1oFKUoFKUoFKUoFKUoFKUoFKUoP4rtXikpBBFe077dK8UjcCgp7xvaXu37BIOo1qYK5li3YmpSOqoi1b837Cz19yvdUMcP8AxJqw6PHwnPnnX8fB5IdxO612/c/RV5qa/iny6dB0Lu0OHcrdJt1wjNyYklpTLzDo3S4hQKVJI9CCRXKvXPSWfpDqrJsakuO2eSTItUtQ/Osk/RJ+2gnlI+B7EUHRlp2JPgMz7fKZlRH0Bxp9hYWhxJ7FJHQioq1X0QxTU+KqRLbNuvbaeVm6x0jn6dkuJ/rE/HqPI9Nqp7pVrpmelUxLFvf+crGpfM9Z5Sz4R9S2e7aveOnqDV1tOtacA1Tjpas1xEK78u67TNIQ+OnXk8nB70/eBQUO1B0uy7TW8iHkUD+juHaPPY3UxIH6KvI/onr8a0yuqF6sVtvNrftV5t0afCfHK7GkthaFj3g1VzUvhKcJfvGmMjm7rNlmObEe5l1X+qs/teVBGvC3kacc4o8dU86EMXEuW1e/Yl1BCN/grY10sdIKRzAFJ23B9K5Bvxr7iWVpamQ5Vru9ufS54MhCmnGnEkKG4PUdh91dT9Os5hak6T2jMISk/wBNY/pDaf6l9PR1B9Nlb9PQig5a5ZbDZM/vlmUNjCuD8cjbbblcI/wrFx33ostqVGdUy+ytLjbqe6FpIKVD3ggH7qlniaxpeN8TOQ/kyli5rTdGj9rxRus/94HB91RFQdadJs3Z1O0RsOXoKflEqP4ctA68khB5HR+8D+NZO4w9irpVUeA/PUNXHIdNZ0kj5QBdLe2o9CpI5Hkj7vDVt7lGrcXi+Y5DyWLjk29QI13mtl2LBfeSh2QkHYlCT9LY+lBVfiJ0ZVkER3N8bjk3eMjebGQncy2kj6YHm4kfvD3ivfwo8RSG24mledTyNtmrLcX1dNvKM4o/2Cf1fSrCXCGUk9NqqPr/AKHORn5WeYbEPh7l64wGE7FB7l9sDy36qA7H2h50F28w05wXUCK0xmmJ2q9pZ6NGawFLb9QlQ2UB7gdqpNxfaqx8AhucP2mmOIxa0KZQ9dn40X5OmYhaQUtNkDdaNvpr3O5HLv0NSbwx8TTeQMxNO9RLghu7ICWbbdXlbCYOyWnCeznkFfW7d+9isy01wXP5VqkZljEC7vWmSmTDckN7qaWk77b+aCQN0HofMUHPLCuCTP8AMdBP57ie1bb9KIkW2xzEcnjx9u7i/wCrWroUgjbbvtuK1ZWg/E9qDlcHGMix/J3jASGG5N9kExoTfTc86lEcvb6O5Ow9K6wdhVSONPiFODYidLsRuJRkl2Z3nvsr9qBEUOwI+i44Og8wnc/WSaCoOqORQ4tmtOgmnUxdzsFmlky5kdP/AKduqyEuPBI7tpOzbY69E83mKk/SXia1M4e8jTpxq7ZbtNssUhBhzek23JPYsqPRxv8ARJI+yfKoQxe3alaU/wA1NbYuKKTazJLtsuE6MHorqkEp2UO6d+oSTyk7EpPTert5Dqjo/rLwhO6x6madBL9ifDEWPL3HyianYpZjvJ2U4ytXRaT2AWCDy70Fn8Yy7HMysbN2xy6sTY7rLT5Sk7ONJcQFo8Rs+0glKgQFAd+m9ZG42233e1v226wo82G+nkdjyGw424PQpPQ1yFwO566XzOMm1R08kXl2725Jud3mW9QAS2pf0VN9nE/6MA7JSemyavLwu8VidZJKsLy6AzByxiOZDb8UbMXBtO3MpKf6tY3BKexB3G3ag8GpvBTjl5ddummlyGPyjuo2yVzOxFn0Qr6Tfw6iq97cQnDZdiE/O1lhBXkPlVtfG/3oAP7JNdMtt+1fN9hiVGXHkstvsrGymnUhaVfEHpQU5wnjoYKGYuoeIuIV0CrhZl8yT+kWVdfuSasDievmkWaJSmzZxbEPqHWNOX8ldHuIc2G/wJrAZrwr6N5n4j6ceOPzV7kyrKoMdT5lsgoJ95TUA5XwJ5LHUt3DsxttzbHVDFzaVGcHu508ySffsmgvI2428yl5paXGlDcOIPMkj3EdK/QIPYg1zaOjfFHp08p6y23KI4BPK7Yrh4/N7wltZUPvAr+DXnicw3lZu13vzQR0Kb1aw4T8S4jeg6TUrnZG40NaYyQmQLDJI7l238hP7pFez/hwatbbfM2K7+vyZ7/9ZQdB6/hIHciudcrjP1rlIKYxsUUnsWbdzkfvE1jTrfxQZr+StV3yR7n6BNktnhH7i0jeg6RvvsxoypEl1DLKRup11QQkD3qPQVGmXcQ2j2FpWi65tAkSUj/kluPyt1XuARuP41SpOh/E9qG+mRfLZkLwV3ev1xDO2/qha+b+yakTE+BG9uqQ7meaQYDfdUa0Ml5Z/wDeL5QD+yaD3Zxx0PLbei6eYkGu4TcLysK29FBlP9yjUQR7LxB8SN4TJkC7XeHzbpkTD8mt7A9UjYJPuICj76ujhXDFo5hJafYxhF5nNkETLyr5SoEeYSdkJP6qRUvNtNtNIZZbQ22nolttISlPwA6Cgq/phwYYljbzN11BnJye4IIUmEhJbhtn3j6Tn37CrORIcSBBahQYrMaMynkaZYQEIbT6JSOgHwr9h5kveEl5oufYCxzfh3qonE3xY5tpHqizg+N4hGZCEMzF3S4K8QTGSdyllA6J7KQVK3IPkOm4Ttq1rjp9ozYfluX3YCa4gqi2qNs5Kkny5UfVT+krYfGqXyNVdROMXMLjpq1Y5Frx19HiwzbwpbdueR1bcnODYONrAKVJ8twpIJTUc8UOIheXW3WTH50y6YnnLAnxJUlwuLivkbuRVE9RyncpB8uncGpZsHGVhGm/DRZMe03wGLCy1Ufw5zAa8OGw8n2S+tX0n1L2Ctt+hJBPTYh49V+B2XhegMfJsVusu+5LbEKkXqMlPsSGyNyY6O48PruDuVDc9xtWT4LeJRNqfi6O51cdoLquSwz5C+jCz/7KonsgnqgnoDunsRtaThw1Mv8AqvoHbMnyi0SYN1ClR33XI5ZamlPZ9kbAFCh6dAQRVO+MfhwVgWQuap4LALWNTngq4Row2FtkqV0WkD6LSztt9lXTsRsHR6oL1+4YsR1yZjXFT4sWSRyhAu7DQWXWQRu26n6+w35T3Sfd0rEcHusGT6q6OOMZZbZqp1kWmIL0tshm4o26Hm7F1IGy9vcfM1YvudhQaxp/gOM6Z4BBw/EoAiW6Inp5uPOHbmdcP1lqI3J+A7AVVniu4ikFmZpZgs/cndq9XFhXQDzjNqHf9Mj9UedZzib4mm8cZl6e6d3BK7yoFq43VlQKYQPQtNnzd9T9X49or0B0OcmSI+eZnEPhBQet8B8bl1XcPOA+W/VIPc9T5UGy8OujKrDFZzjJYqk3aQ3/AEKK6jYxG1D6ZB7LUP3QfU9LQW2H1Hs15IETmUCRvW2QIfKkHag+U6dAx/HJt7ubqGoUFhcl9ajsEoQnmPX7q5N5VkMfNs4vmfZM/LLl1uZcbix+UOlsnr1V0HI2EJHkVd+lXh42M8ON6Kw8LhyC1MyaR4TvKdiIrRCnfuJKEkeYUa54S3EOy1lpKUtA8qAkbdB5/E9z8aDb8jhacybDJewgZGH2pUWM2bspsl8OJeK1BKPo7FDQA95NdOsFs/8AN7TewWJSQhUG3R4yx+mhtIV/a5q5q6L4u9kWuuGWx9griybimU42rs4ywSpZ29PYWN/ca6aXq+wMYxC5ZJdnAiHb4y5T5J23Skb7b+W52H30FDuMzKEXviEbsjDnM1Y7e3GVsenirJdV945gk/Cq71mr7drvnGoFwvTrL8u53iat/wAJtBWta1q3CQkdSdiBsKsRpZwoTZQYvmpynIbB2WiyMq2dX6eMsfQH6Kfa9Sk9KCDsA0wy/Um8/IsbtylMIUBInPezHjj9JXmf0RuauvpPoNimmbaJ6Ui7X8p2Xc30fm/UMoP0B7/pH3VI9lsVtstqYtVmt8eBBYHK1GjNhCED3AVj811EwnTS0pm5beG4ziwSxCaHiSXz6IbHX7zsB5kUG0tMAIK1lKUpBJUogAAdySewqp/EDxMRnIs3AdNZ4WFbs3G9sL6EdlNMEdevUFf3J9a0TVjXzNdTnlY/aI8ix2OQsMsWeMSqXcCTsA8U9didvZGw/WPWtew3Fst1vyXH8Bii3MpgKcMh2Lb0R02yMClKi4UJTzqJB2G5JO3UEmglrgh0teuuby9T7lG2gWpKoluKk9HJKhstQ9yEnv6qFdBIo2SBtWn4ZjFlwrDbdiuPRRGtsBoMso+sfMqUfNSiSSfU1uEXfbpQZBHav1X5SNhX6oFKUoFKUoFKUoFKUoFKUoFKUoFeWQjcHYV6q/DiQU0GuTElJJqLtYtL7Jq3p0/jd1Ijy2yXrfPA3VFfA2Cvek9lJ8wfUAiXZrG4Na7LbKFEig5E5Zil8wnMJ2M5FDVFuENzkcQfoqHktJ+skjqD51iGnXWH0PMuLbcQoKQtCilSSOxBHUH310o1w0Xsur2LBClNQcihoPzfcint5+E7t1U2T96T1HoedWS41e8QymXjuRW92DcYi+Rxlz+CknspJHUKHQigmfTviszfFks27K0DKLWgBIU+rkltj9F36/wX1/Sq1+n2rmn+pDSRjd7bTPI3XbJZDUlH7J+l8U771zTr9tOusPofYdW062eZDjailSD6gjqD8KDp3qLo9huq9gVCyOF4U9pBTFukcBMiOfIb/WRv3QenfbY9ahLh/l3/AEP1qumimeK8KJd1fKbRM6hh94dAWyfJxI228lJ2PUiox0x4tM6wxTNuytByq0I2Tu+vkltJH2Xdva+CgfuqzMybpLxTabm32m9Bq7RP6RFUoeFPtb3ksI33KdwN+UlJ27ggbBGvGvhpl41Y85is7rgOmBKUB18Nzqgn3BYI+LlUtq+duyKfl9ovXD1rQhMLLFRSzFuR/NXZA/NyGj2LgKQr3kHoFAiqRZNjd2xLLJ+O3uP4E6C6WXUjtuOyh7iNiPcRQZ7SPMnNP9cMYy1LikNQpyPlG3mwv2HR96FKq6XG/iSbzp3iuYxFqDtruBiqkNK2KW307pKSP9IhJBHurnyeo232rorYbiNbP5O1yMhQduka1GOdzuUS4QBST7ylCFftUGpcOmv0jIvk2nGo0si9+GDabnIO3zg3t0bWrsXdux+t1B9oVYGbE2J6dK5bT5EaCtpVulOyY0xhqY2+6gtOwpB9paUKHmhe6SRsFdDsCBV1+HLXxvUK1tYRmUpLeVxmwI8hwgfObYHcf6UDuPrDqOu9BoGuGgS4zknMsDhqKNy9NtTCSSnzLrIHX3lH3it24duK4JEPA9U5x8mYF/ePbyS3IP8AAOfcr1M9S4hSrmA227EVXXWPh7i5OuRkmGNMw70oFciD0SzNPmU+SHD+6o99t96C7iFodbS42tK0KAUlSTuFA9QQR3Brl9xPcOWpeD5rdtQpcyRl9juElUp+7hBL0dSjvyyGx9FI7BSfZ2HlW56L8SuV6P3EYXnMObccfjueCqM9uJdtI7hvm7pH2D9xFX0xnKMZzzEWr3jlyi3e1S0FJWj2gQR7SFpPY+RSoUFcOHHiIw7W/FEaSZZicOHdW7f4JtzEXnt02O2kD2Enfw9gB7Cvdyk1WTivz61XzPLXozpxDRHxHEVfIo0KCCpEiYo7LKe5XykhA33JPMd+tXinaJ2vAsOzu56GY9brRmOQxS20486UNMq2PRvofDHUq5R05tj02qrfCrw6X+y6xXfUHV6zSLLExBSnUN3NOwelcpWX+bqFttp3XzgkFRBB3SaCJtOuIrItHdFck0wsuExIl6ubzgevEguIksqWjkIUyU9VJTuEgkbcxO3XrJPBfpncMdye4655sy7YcXsFveDEmcgteMopHOtIVsSlCRtvt1UoAbmorya+XDiF44U3LE4JZXebww3BSEbFLDPKkPObefI3zqJ7b+6po44Ndje74dFMRlc8CG6lV5eZUNn3h1RGHlyo6FQ7c2w8qCHdTOJPUrMtbpupGK3+847b4q0wrc1EfKEMsAqUhLqfoLWvZazzAjffyAq0Q4wrrp5ohpleM9soyO95LDemzvkikxXGmEuqQ2sI+iVK29w9Kq9r1g8XSvA9PNMmXGXr1KgryC8yGVBaXJElQaabCh3S2lpSR68ylfWq6mseOYLh3AmHMuxW0XSVZMdjwYXy1hKlolKbShPIruCFqUr4igy+D8Yehma+CwvJlY9Oc2HyW9tFj2j5BwboV+NTjAuMC6w0y7XOjTo6uzsR1LyD96SRXJvhy4epevl4yGD8/Kssa0w21mYY/jpU+4rZCFJ3G4IQ4Tsd+g9alvWvHL3wycKmKaa2rKnRfbrkEi7SZ9sUtjmbbSAkJ67gA+HuO25Peg6I7pJ7iv7uSkp3Ox7jeuWz/EJxE4Np3huRI1IuExu+sSnUN3NluUAlmQWh9MddwN6ug7rlcca4DrbrPfWotwvTtqYd8Hk8JqRKdUEJHKn6KSo9duwoJnk47j807zLFa5J9Xoja/wC9Jrx/zIwsHf8Amfj+/wD+jWP/AJKptE/lAr4vD5F6f0ibW1HkIjLktXQpa8RYJCQCgnfYb9+1Yh7+UYvZ6MaX25P/AFlxWf7gKC9sWwWGErmhWS2xj6sRW2/7kiskVKI6qJHvNRZw/arTdZtE4ub3C1xbZIelPxlRoy1LQnw1AA7q67neo+4vtf75ovhVpteIJZRkF8U74cx5AcENlvl5lhJ6FZKgBv0Gyj6UFkt0+orEZPleN4Xjj1+yu+QbPbWdguVMdCEgnsB5k+4bmuZd41B4tcBxjGdU75nF/TaL8rxIK5MtD7LvQqCHGewCkgkA9x6ViuJrWa76xTMLuzoXGtwsqHhBQo+EiYVFL6gPPZSeUHyHSgvHB4z+HydkTdpTl8ljxF+GmZJt7rcbf1LhGwHvPSos40+IjJcOXacB0+vBt6rlB+cZt2hr/KllR2bQ04PohQBUVJ69gCKiXXPhmxPC+FjFNVcDm3GZ4rMVd1XKd50uokIBQ6kfUAWpKeUeSvdUK3x6fl2g9kvjqi+9ib3zFIUTzKTFdJdjKV6JCg42PhQbRluiGtOmuKY3q1IlyHHbyttbMy1S3HpkZ1xPO2HFJ9oqUB3BI36HvVjNVcFz3XDgZtOdZpi8y3ag4uhx1QeYDblxiDYrWEDqOZOy+Xp7SFHYAgVJ/BXqYzqBw6RcbnuIdvGKrRb3EubFSmO8dwb+iQUb+rZNfq+cYeAw+IGFpSxZblILtz+arjc5ifk7MZwnk2DagVOAqIG55RsdxuO4Vl4WrtYNUtN8k4Zc3kBEa6JXc8elq6qiS0jmUEb+f9YAO48UedQ9isSFo5xPxLdqvika6RLNcfk9zt8lJUgp7B5I3AWACHEg7hQ23BrbNfsCvHDrxWJueMKXDiKkpvdifT2bHiblr38iwpJHmnbyNWM1n0mY4r9KcP1l0sjxE5FKbbiz4zrwbSpvflWlaj9ZlfN123KD0B3FB+tWOPDH8duLFh0gtEa+ojuNh65ykFuKWwRu0wgbE7j2Qo7AbjYHbarYWyXZNRtL40yXanHLRfbelTtvuLJSotuI9pt1B7HqQR7qhDQ3g8wXSwx79kvg5VlSPbEl9v8AosRX+haPcj7atz6bdqnjKcsx7C8ZkZDlV3j223sD235CtuY+SUjupR8kjcmg+9os9mxjG4tmssCLbLXBZDbEZhIbbZQkeXp6kn3knzqonETxXgJmYJpZO3PtMT7+ye3kW4xH4Fz7k+oj3WriWynV64fzKwSJPt1gkOeCI7IJl3M79Avl7JP2B95Nbbo5w9Rsacj5JmjLMu8J2XHgbBbUM+RV5LcH4J9560GtaI6BOzHY2ZZ5EWEcweh2p8dXPMOvA+XmEHqe5q2kKHzEdK/MOIVKBI3J7mtX1W1gxPRnFROvCvll2kJPyC0srAdkEdOY/YbB7qPwG57Bsmb57imlWDvZNlcwNMp9liM3sXpTnk22nzPqew7moH4e8o1I114mZWqN3lTLZidjYXHYtsd1QjFawQhkjfZxQBK1qI78u21VifueofEnrvb4MyV8pulxd8GOykER4DA6qKU/VQhO5J7nzPWuizkfGOHzhpmIszaG4GPW5x9K3BsZUjbotfqpxwpB9N/dQUb4sdRDlHE1eGIhbeh2Nj5ljlXtBCxuXlpH2gtSkg/opNV/CVKUEoSVKPRKR5nyFeu6uTnbzJdualKmuOqdkFR3PiKPMrc+u56+/evXjFgueTZTAstnaU5OmSER2ABuAtR7n3JAKj7gaC0nB3p6oZZe89koK48RHzVAeI6OOHYvLT7gAlIP6Sh5Vvev18yHU/JWdAdN0pkSXCiRkM4qIZhtA7pacWO32lDueidtzWSu16d0xw6waK6VRUXLM5MYNRk7bohIO5cnSD2A5ipQB7k79uh3TGbRgPDzpYVZHkcaO/KWZFyu85f5e5yj1UoJ6rX1J2SAdh7yTQeLTHQnC9Jrahy2Rvl98UjlkXmUkF1RI6hsf1aPcOp8yay2aZzh2BW35dlt9jW9Kh+TYJ533vchoe0on4bVXvVLjAuDjztpwG0uWlo7pN1uTaVSSNu7cffZv3FZJ7EDyqql6vkq9XuRd5c24zJz6iVy574edUD6q2Hn6bCgsfqDxY5NcUuQNPba1j8NQKRc7ipC5K/ehHVLf3gn3Cq5T8guc2c/OlXCRMuUlXNIuL7hcec9wWeoHvHU9ug6HD+e/mfOtrwvG594vMFcC0m8TnZiGYVnU0spnnqVlShsEtoG3Md+nMnsNyAzGmFnvUjLIycchmdlU8LjWiOCd4ylpKVzHD9VKEFXLv5nm8hv0L0a0nsekGAIsdtUJVxkEPXG4qHtyXdvXuEDqEj4nuTWraEaKW3STHHZMoszcnuCQZ0xPtJaT3DDRPXkHme6iN/SprjNlZFBkoiSVA1nIqNh1rwQmNgNxWYaRsKD6AbCv7SlApSlApSlApSlApSlApSlApSlAoaUoPM+1zA1gZ0QkHYVsyhuK8UiPzJPSg0CYwpCidqi7VfSTF9V8c+RXlkRbmwkiHdWUDxo578p+2jfug+8jY9anGfA3BIFazNhlJOwoOWWoGnGU6a5Qqy5NBLfMSY8tvdTEpH2m1efvHceYrU66nZPjFiyvH3rHk1qj3KA79Jl9O+x+0k90q/SHWqb6rcLmQ406/ecCRIv1mG61Q/pTIw9OUfnU+9Pte40Fea9Vtudxs12YulonyYM2OoLakxnC242fUKHUV53G3GnVtOoUhaCUqQobFJHcEHsfdX5oLM4vq9bdaYlr0/1X5oeRIdSmw5lAAbfjSdxyeIBt3IAJGwPTcJICqwetMK73SQm2Z5GZiZ/Z2OX5a0AljIYAPRxB7eMjqeXzHMNgQRUBoWttxLja1IWkhSVJOxBHYitzy/U7Js+iQ2stkJmuxGkttyUJCHFFPQLV5FRHRRG3N3PXrQaYpPKspBB2PcedWp4KdQxaM1uuns54fJ7sj5ZDSvqnx2xstGx+0gnp5lIqqx2KiRXvsV6uOOZNAv9ofLM6A+iSw4PJaTuN/cex9xNBNPEHpj/AJOtS58CLCSMbv7irjaZASSYz4BK44O+w3JA223I8MjbbrDcG8CHAabaZ+Tz48kSYt0YWpD7BA+j07jcAg90kdO5B6Fz42N8SPDfHeQtLC5zXjxnR9K3zkbg9vsq3BHmk/CufWVY/dMay2fY7xCXEuMJwtymFeSx9ZPqhW4UD6H0oLuaB8RMfPWo+FZ263DytKQmNKV7LdzG34B3by7K7jruKnKXCIJ9muT8aStCmkGS4yltfiNrQTu0vyUNuo6gdvjV3dAeIw5EiFhGpUxtF1d/JW2+LOzVx2O3hrUdgHR0G/Tm6b7E9Q3PUzSHGdRoBNxZ+RXVtOzF0joHip9ErH9Yj3HqPIjzrK2NX+GzNk3O2y3I0Z1fKJDW7sCekfVcSem/uOyhv0Iq+MyAUk+z7u1YC62eFcrc/brlCYmQ308rsd9AWhwe8H+/uPKgxmkPFZg2oqY1nyBbeM5G57HyeQv+jyFf6J09Nz9lWx+PepryGw2vK8TuON3thUi23GMuLJaS4psrbWNiApJBG48waorqLwvtOF256dvhpX0lWeWvdJ8/yTh7e5KvgCK1zBuIbWDRS5oxrIo0m5W5g7G03oKDjafVl09QPTqpJoJjtvCxf9DLhmGaaNPDI7xLtKoNiiXNaGn7c444PEcDh2S4Q2Dy/RJJ2286gDSPg9z7U+55Q9nr12xB6CeVt6fF8R2VLWeYlQKgVI26lYPdXTertabcTGluo6GojN3TZLssAG23ZSWVE+iHD7C/xBPpUxA7bbE9Oo91Bxvsmn8r/hX2rSyXcW7ouNkTVnckMFXhqCHwlRRzdQnoTVuP5QzNvk+JYtgEZ4hc+S5dZLYPdtv2Wwf21E/dUvWvhM02x/iAtmq2PP3ODMiSXpbtucd8dh51aVgLBV7SCFKCtgdulQTxW8O+tmpWvTuW2OzxblYltx7fD+SygXozQ2BW42rbb2lqJ5SegFBLXA3hH81uF5m+yGeSXkkxy4EqGyvBT+TaHwKU837RqsvHvlC71xMxcdjOeIix2ppgNj6r7qi4ofePC/GujWK2CFieEWfGYCEtxLXCahtpHYJbQB/ga5WuKc1o/lAiUr8Vm8ZXshfcGO05sk/Dw2k/jQSJxd4QjCdB9ELUnoqHbHobnrz8jTqt/vcNYbW/UBI4KtFdOor+xdtyrtNSD1CW1raaB9xV4h+KKnH+USt6XdKMOuiUnaPd3mgR2AcaHT+x/Cqg6Z4/P1p14wjCXucxW0MQl7dfChs8zrp/i4f2qCW9QdNVYH/JoYlLmRg3dL1kDd2lbp2UkONKDST8G0j96nDjr5ozphpHJsOf4M9e7wu5OSW5DVtjv7MqQ2Ep53CD0KVnbt1qxHHfCjscI0ZqOyllqLe4SWm0jYIRyOJCR7gAB91QJwo6XaB5xpdebtqxItrV0j3Ux2BMvKYW7PgtqGyCob+0pfX7vKgvTpDmuLah6S27LcNsy7RaJi3PDhuMtsqQpKuVRKW907nbyqFONbRPJNUtPrNkOGwF3G8WBx0uQGvzkmO4E83IPrKSUAhPmFK9KnHS+zaeY7p6xYNMZdukWGG6tKBAnJmIQtR5lArSo9eu+xNa/wAQ+oGV6X6B3TN8PtkKfNgus+KiYlSkNsrXyKXsnuQVI9229Bz3014ms60vgRMHzLGrdluPWx3dqzZBG/LwSCejS1JJRtudgpJ27DYVuHFXlGI6zaWYfrJg8Z2M1Cfcx+6wnkJQ5CWoeMylQT0IP5TZQ6ECvRO1r0z1r4b8we1uTZo2okJa3LHKgQSy+8ChPhoQpAPNspKgoLO2yhWJ4UtMZOrmmurGFuq8CLLt8NUWU4CW2Z7bji2lfhuFbdeVR91BP3D5Jj62fyc9307mv8863xJVmUV+0pGwLsZYHoApKR/1Zqq3C/a42Uar3zSe/AtQsts0m2OpKdyzJa2dZcA9ULSo/iPOv7iC+Jbh8ym+WHG8Wv0CZcEiNKaFocmtOlO/K40pKSkqAUrZSSeijU+cH3Dbm9j1KGreo1uetKmG3Db4MvpJfddGynnEj6AAKtgepKj0FBXbTTOMy4VuJCam82h5x2Nz2+7WtS+T5UySCFoPbuErSrt5b7E1lIach4neNVWSYpjK7c3NuceZJ5CVohMtcnM464ABzEN+7ckAetdLMz0q041EcYczbC7PfHWBs07LY3cQPQLBB292+1ZfGcSxjDLKm0YpYLfZoKevgQWA2k7eZ26qPvO9Brep2jmBavxLRFzq1uT2rVLMqOG3S0pW6eVSFKHXkVskkAgkpT19drsVgsWL2Jiy45aIVptzA2biQmUtNo9TypG2/qfPzqMdSeJbS7ThDsWReU3q7JB2ttpUl5YPotY9hHXvuSR6VUDOuInV/Wi6rxrGo8m2W6Qdk2myhRecT2/Kuj2iPX6KR8KC0er3FXgunIkWixLbybI0bo+TRnP6PHV/pXRuNx9lO5+HeqfPK1f4lc2NxuMpyTGaXt4zm7UCAknqlCe2/uG6jt1JrftOuF9CC1c9RHws/STZ4bnQf9a4P9VP4mrKWmzQrZbmLdbITEOGynlajsICEIHuA+A69z50GjaZ6QYzpzBCrez8turieV+6SEDxFeqUD+rT7h1PmT5SlEhFRHSvtEgFRHSov1t1zgaX25eP42y1d8zejrfbhjZSILSUFRff9wSCQjudtzsO4e7WTWzH9HceLKUJueTyGiqFakEnYf517bqlsfirsPWqQ33H8xzd7/KHnl+bU/dUvyUp8VDj6GGWysrLXMAy0N0IQkkFRUAkHrWmXrILvf7rOvN7us+ZfZ0jnfeUrqtJHYkde+wCR0ArYNNdO3dRdUbLhdldeU3K5X7pIDfKmOhOxdPTvyj2QT3UR23oLa8FGmCbDg8vU67xdrheQY9v5x1aipOylj0K1Aj4I9FV5ONzUZMTG7Jp3Ed53JzwuU9tJ2/INnZtB9ylbnb9FJqya37HhuEdS1brJZ4YHfZLDDSNgPuSAPea5bapZ7N1L1XvGXy+ZCJbvLGZV/VMI9ltH3J/iTQah7br2w3Utaum/Ukk1NWhlwes2TTV4xbEXTMA2qJbGZA5YtvQR/SJ8lw9AlO3KBv5eQPWIbO0l69MIMtqKdyUOu/R5gOg+89OpA9SK269ZOzasTVi+NIECBIX/SkJdS5JnFB28SW4noQT1QyklAHU7mgmSfrhadLmLhatO5kfI8uuJLl7zm5p5kvOeaY6D1UhPZI+j0B2VUS3DWXLJlplIXKU/e5jqlS8jkq8Watv6rLKiP6M2Ou6W9ubfqRttUdrWtxwrWoqUe5Nfmg/qlKUoqUSpRO5JO5Jr+V/QlSgSlJIHc+Qqe9JOHvLsnfh5A8tVhtvsrE6bG2kE+fydlXmPJ1fTsQDQRbhGE5BmGXIstks67hcEkH5GsFCR+k6roG0DuSSN+w89r+aP6TQdM8fbMqaq8ZA60GpFxd3IbR38BgH6DQPkNuY9T5AZ3C8Ix3BrF8043b/AJO24rxJEhxRcflL81uuHqtXx6DyrdYcRS1DpQemIypagdq2SDE2A6V8LfB2A3TWwx44SntQfthnlSK9QGwr+JSAK/tApSlApSlApSlApSlApSlApSlApSlApSlAr8qTuK/VKDwyI4Uk9KwM2ADvsmtqKdxXkfjhQPSgi3KbNNmY1colukPRZjsZxMd9g7Lbd5TyEH15tqgjQvWj+fsReKZStETM7du28jbw/loQdlOIT02WCPaSPiOhq106Ek83SqbcS/D1dHbw/qtps1IbuzZ+UXGFCUUOuEf+0McvXnA+kkdT3HXcUEkZxpDp/qCpT2S4+0ZxTyi4RD4Egem6k/S29FBQ91V/yng4uLRXIwvLY8pHcRLq0WlgegcRulR95SgV5dMuJfP7fb47OW2dzKrWZKYSJTGyJwcKSoIAHR07JPTbf4k1ZXDdTsEzxHJjuQMKmpVyOW2V/R5bSuxSppXXf3DegorftCdW8cStyfg9yfYR9KRASJbYHvU2SB99aBJjSYThbmxnoygdil9soIP3iurJaW251BStPr0I/wARXhudrgXYct2tsO4DttNjokf64O1ByvHUbg7j3Urond9DNJ72srnYNbG3Fd3YoUwr+ydh+FaZdOD/AE1uIUbRdcgsyj1GzyJad/gsDYUELcM+sQ09zVWN3ySU45eHUpWtatkw3+yXfck9Eq92x8jVjNfNEI+p9pbyCwhpnKYLXK0SQET2u/grV5Hvyq7ddj0PSGb/AMFmXxkKdxjLLPdR9ViYhURf3q6prb8F1A1R0YsrWM6w4Ve5VgjDki3uC38qMdA+qspJ52x5E7Edu1BUK8W02q8yIJ8YKZVyONvtlt1lY6FC0nsoHcdNwe4r5MTXEQXILhKmFqDiR5tuDstPofI+vxAIuTqdgmBcQNlGX6X3u1z8pZb9thl4IXPbA/NuIOykuAfRXsR5E9jVO7raJ1nucmBPiSIsiM6WnmJCOR1pXotPl8ex8u4oLfcOXE4mX8j0+1PuADp2Ytt9kK6K8ktPqPn2CXD8D5GrYS7cevs1yEQoJUAoBSN+qT51bfh24p27EzHwXU+c67aE7NQL27utcTyDb56lTfovunsdxQWrkQlJPatYybEMeyy2G3ZLZotyj/VDyfabPqhY2Ug+8EGpNMaNOhtzITzUiO8gONPNLC0OJPYpUOhHvFYqTbSCTy0FP814VnEFczArx4g33FuuaglQ9yHhsP3gnb7RrV7Fq1r7oVNatc6RcEQGuiLdemzIiqT/AKNZPsp96FAVdR6EU7nasdNt0eZDXDmxWZMZf0mJDaXG1e8pUCN/uoI+wjjjxC5BuNneOTbE8dgqXBJlsH3lOwWn4AK+NWDxTUzT/OI4dxTL7TcztuWmpCQ6j3KQdlA+4iqyZPw5ab39Tj0OFKsMlXXxLav8nv6lpe4P4j4VEV+4Xc1tcj5VjF6t12DZ5kcyjEfT6bb7gq+BFB0iI6bKHQ+o71H1q0N0jsOoUXN7DgVotN8ihYakwGywkc6eVRLaCEE7HuRuO9USiZdxN6XKDQn5fHjoP0JKDPZIHqTz7D7xW32Lji1MgK8G+2LHr0UnZRSlcRY/dKutBbXW7Rmya46dM4le7rOtjTExE5qRDShSgtKVJAIUCCkhZ9Ow61oGgXCdZtDNQbplTeVvZA/KifI4yXoQYMVJUFLO4WrmJ2A32HTf1rT7Vx3444Epvmn92jK+suJKbdT+CtjW3Q+NXRiQhPyn+ccNZ7pXbSsD9pKqDb+I/Se86z6HvYXYbjb4E1U6PLS9PKw2A2Vbj2EqO/tdOlVIZ/k7NQFkfK8/xdA/0bUhf96BVpY/FtoS+kFWWvM7+T0FxO1er/hVaD8u/wDPxj4fJnd/9Wg/PDZopc9C9NLhi1zv0S7rlXAzUOxmVNpQCgJKdld+1S3dbXbr3Y5lmu8Nmbb5jK48mM8nmQ62obKSR6EE1Dkji20JYSSnLXntvJmC4resHL41dGI6VfJzkctY7BFtKAfvUqg1uZ/J/aOScgXNj3zK4cJa+cQGpLSkoG/0UrW2VbfEk++rC6f6dYfpfhjWL4TZ27db0KLi/aK3HnD3W4s9VqPqfgNhVb7rx3422FJseAXaUr6q5cptpP4J3NR1fuOLUueSzYrDj1lKjskrSuWv+0U9aC/4Kz9HmO3p5VquV6lYDhLBeyvL7TbDtuGnpCS6v9VA3UT7gK59zMw4nNUFlsz8ukR19m4qDAZAPoRybj9o167Hwu5tdJJlZPerdavE9pfKtUt9fruRsAr4k0E7ZvxxYdbA5GwTHZ1+eHQS5pMRge8JIK1fAhPxqvt+1c1910mO2qA/cFwHPp26xtFiMlP+kWDupPvWogVNOM8OGm9h5HpsKVfpKSD4txc2b/7pGwH4n4VLEK2x4UJEODFZixkndLEdpLTYPqEpAG/v2oKyYXwrPL8OZnt58LrzKt1sUFqPuW8dwP2Qrf7QqxGMYfj2JWsW7GbNGtsc/S8FPtuH1Ws7qWfeomtlZhFRHSsnGtpJ+jQY6PDKiPZrNRLd1G6a97UFqOwt+Q42002krW44oJShI7kk9APearHrNxSNN2u5WLSSSHGYo8K45WAPCYJPL4UTm/OPEkAK6gb77bDeg2fXziCt+mUJ7FsRciz8wcb/AChUoFm1II/OPeXP19lB9xPToaDTsinPLuUldzlzLndlL+cp7ytzISVBXKCRzdSkEnpv0G2w6+e/XOJd727Jttukw231hSm35i5jjrnmtS1AEqJ67dep6V8G7PPVc0W92HKblqc8JMTwFGQpf2Q1tzc3u2oPhFbUXEueEXfa5EtgElxR6ADbueo/hXQnhs0jb0r05Xd762hvI7s2l6apZ/5IyBulnfy23KlH1PoBWgaHcPqLNeImoOcWdFtMBhJg2qQ6HCyobkypSj7KVnfcI7J2B36Vv2Ta3QbvlMbB9OUXO/ynZSGbtdrLGVKbtzG+7nIseyp4jdKeuySd9z0oI74rtWk3HHHMJxuWy/akPNi6SmnhtKdI50RmyDupKRstwjoPZT57VTMnqST1q+t84eot3kePZ9P8LYEl5+QqXfW5ba4vO6VJbENpzlPslO6goblPwrCscIeNGWJeQZI6pW3WHY4KIcf7isrWKCkvIoj6BI+FfVmHIeVyMtFR9E9T/Cugtn4ftJrE4lbGKJnOIIKXLnIXJIPw3CT94rfrZY7RaQn5ps1ut5T0BhxG2D+KEgmg512PSXUbI0pXZ8NvUppX9cmGtLY95WoBI/GpSxfhGzm5uocyW426wR/rDnEx7b3IbPJv8VirqqDjq+Z1Slr9VnmP8awmUZhimEwFy8tyCBaEIG/JJdAcPwb+kfw299Bp+BaFae4AWZcO1m6XVsAi43PZ1aFeraNuRv3bDfy3NenVTWPF9LLSTcXfl97dTvFtDCvyq/RSz15Ee8jc9gCahvUripmKgSLfpvaX4aS1zG83Rvw3OUnlBZZPYnfoVehIBFZzh84c7vcr9H1U1YEmTPcWJUG3TiVuFX1X5HN59ilB7dCdugoJ/wBMGcruGnluumapaavM4GW7FabCExELO6GQO55U7bkkkk9TUmwbftt7NfuDCA2O341nY8cJHag/kaPyjtXtSkAUSnYV+qBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBX5WN01+q/h7UGNlIBBrBymxz79j6itkkI3SelYWUyRv0oKpa7cMLeULk5bpopFqv3P8pkW1CvCYnODr4iCOjT3v7KPfYneqZZdeM1l5GuPmq5r15gbsu/OLfhzWdvJS9gsgeu/wDfXWV4cqjUYar6J4Vq3bAL1HVCuzKeWLeIiQH2vQK/ziP0VfcRQUKxbXvVHE2mY1szKc7EbAAjXNCZrY28khY3SPh1FTFjXGFeCyBk2DwZwHsly0zfBc958JzmKvu2FRNqloJnmmD7si8QTOswVs3fIKStgjy8VPdpXx6e+oueiSGIqJLrDiY6zsh8pPhrPoF9ifdvvQXztXFPo7cWUqnT7tZlnuidAWrb4FrnG34Vudq1q0fuhBiai2FG/wD0uQI3+15a5rNuutKBQsjbsO4/DtX2VMU4ytDkeOtajv4vJyqT7hykDb7qDrDab3YLw2F2i+2y4IPZUWUh0H70k1k3Iyi2oJTuCOoA3B+I865CIUhDgXydR1BSdiPvrZ7RnOV2hra2Zzk1sWkbpTHnPJbPu2Sv/Dagv7m+hen2XSjPes5st3B5k3azK+SSAd991FI2X+0DUH6ncPOqt0QiZbsuh5iqOythCrk2mPcVNKH5pTx9l0DyKlJ2P0QN6iG28Q+stuShEfUiW+kD83NYacB9xUtBP8a2y3cV+rkYj5RGxu6o81GMUk/tJWP7qCIZ+A5Zbbq5aZtiuMa5tpUtUCTHU08pI7qQCNlj9Uk+e23WtdcbejPKbdQtpxPQpUNiPiKtL/wtH7vbDasw0itN2hq/ONqleKk+8NuIKQffvvURaiP6eXtDl6w/HbniifD3VbJklt9px3nSB8n2UpaRylZUlXQcqSO+wDI6X8Quf6VOIZsM9uXZuYF2wz91x/epo92ie/skfAjoLg4Hxb6UZm01FyN57D7mrYKbufWMSfsyAOUD9cJ++ucrLD0hYQw2paj6VlrXHv5fVbbcl19bh3XAaT8oK/eWkhXX0O2/oRQdbWmYN0gInWyVHmxnU8yH4zgcQseoUncEV4ZFsIJ2TVGcF0r17j2MTNPsLzPFLspaV/KmrgIsCQjfrzsuncEeX0wT32qdMYh8b1pS2L1Fwy/Mj6SLlMZQ6oeniNBIB9/KaCYXYBSTsk143IhHlWGm5lqxbLYh67aDTZbqQS8LFe40pI96eblVt8dqhibxrYa06tkafZEHUKKFJckx+hB2I3CjQT0WXEpKUkgHukHofurDXfFcdvqSm+Y7abkNtv6VEQvb8RUAyuNa2nf5Hp1IV6ePPSn/AFQaxL3GrOKj4GmduA8iu7O7/wAGqCYLhoJpRcFFbmIojrPYw5LscD9lCgP4Vrkrhe04f3LEq/xD/opKFAfvoNRe7xkZYt3dnCrK2j7JkOrP47CsxbOMsl1Kb5p2hLf1nIFwKln9lxIA/Gg2V7hSxAn8hk9+QPRwMq/uQK8//BQsHN/ztuvLv28Fvfb8K2mwcUOj975ETrjcbC8r6lxikoHxdRukVIbGf6dSrWblGzrHnIn+eE1AH4Hr/CghtrhRxAH+kZPflj0bDKf70GsnG4XdOGCC9Kv8r1DslCQf3EA1lMn4mdIccCm4d3k5FJH9XaGeZB/96vZP3VHUvjNt6Hj836evut79Plc8IV/YSaCU7foFpTb1hbeJIkLB7zJLr4P7KlEfwrdbRimOWJITY8ctNtG3/ssRCN/4VXBHGifr6asJ96Loo/3t172ONG0/+0afS09P6qag/wB4FBZkMrWkJUVFI7JJ6D7q+zcQkdqrizxqYiEjxcAvu/nySmP8TX2VxuYihP5DT2+KP+klsAfwNBZRqATt0rIMWwkj2agG0cROquUQm5mD8N16usV3q3KdkrQ2R6hQRsR99e6feeNa+QVrsmn+KY4hQ6JdkoXIT8CtW39mgsOzbEoa8VzZCANypR2A++orzziU0nwBDsWNdf50XhtJ2t1kIf5SP846PYbA8+pI+zVUtRcN4rLow+vUezZleo3ciI8lyIB72WSEn48tQHdWJkJ75DMYcgKB2+RvMLjH91fUn8aCXNWOJPPNSprkG4OxYVg+k3Y4LhLBPl8oX3fI77b8m/ltuKhqXPmT3AqU+pwJ+ijshHlslI6Dp06V8FIWj6aFJ95G1fnuKDJWaHNfusZyEw+8+l1KmWmGi446sKBASkd+oH/10q5GnNkumI423ebTp7BxK5ykBVxyrP7gFSCtXVQbZTyrSN+wUWwem+/Wqs45nbdkEp9UG6R7g4yGm59ivDtrcOw2AdCEqCx8OXt2O5rXJF8uU2aqXcZTtxfUkpDk9xUhSd/MFZPUf/QoLxSl6OXKUJmp2tVvzF1JH9CFybZgNkfZiR1bEevOVb1u9r110DsNsTbbPldrhRGU8qY1vgPJQkDyAQ3sa5xC73JI2amLZ/6gBon4lAG9fNy43B4bPT5Tn67ylf3mg6GXTit0kiKUmOrI7glPZUO1L2P/AHhRWo3Hi8wYFXyPEMteG248aO0z/vFbVRkkqO6iSfU1/Nh6UFxZfGNaUb/JNP3lD7b96aH9lDSjWq3rjCyh9tTdksVjtwP0XVJdluJ/eKEf2TVZK/bTTr7obZbU4s9kpG5oJTvfELqnfApqTmt2ZbWOUotiWoCSD5bNp/xrVba9dnrg9IRaHplwmkxokmX4siX4pIBDCd+rm577Hl38t6ymmOneX5jm8ePiVsTPnxXEuqWsf0aIoHcLfcPsgA7Hk6k9B571fPSLQjHNMlrvs59WQ5hKKnJd9mAqXzqO6w1zdUgkndR9o79SO1BHWgHDO9ZFxM01PjpfuzavGg2dwhxEVf8AnXvJbvoOydvXta6MyN+orzsjc9BWUitHp0oPfFb2ANZJA6V5mG9gK9aRsKD+0pSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSg/C0cwrwSY/NvWSr8LQFDtQatKjHr0rDvoUgmt0kRgoHpWFmQNwdhQay6pK21svNocbWOVaFpCkqHoQehHuNQ1mnD3it/iSDiV1nYbJeUXFMwNnILqz3K4yugJ8yjlJ9anCTBUN9hWLeYWk9jQUFy/hV1Wsz7j9vtVvvkfcnxbO8lB29Sy5ylJ9ySqonvGC5jj/Mb5i96tiUnYqmQHmk/iU7fxrpLfc/xXFspttgyK8sWuXckKVDXKPI06UkAo5+wV1GwO2+/StkElfKlaV7pUN0qCtwoe49iPhQcl+Q+SkH9oU8NX6P7w/8AOuplzxHDb4tTl6xGw3Bau65dvZdUfvUkmsQnSbSoOc/+TnGN/wD9HNbfhtQcyvDV6p/eH/nWQtePXm+P+DZrTOubm+3JBiuSFb+myQa6dQcEwO2qCrdg+NxVDstm2MJI+8J3rYEANshppKUIT2QgbAfcKDnPZOHPV++BKmMPlQGj3cuTiIoT8UKPP/ZqT7Dwc3p5baskym1W0JSAtFsZXKWs+vOvlAP7JFXHW2pfU7mvg+lqNGXKkvtsMI6qddWEIT8VHpQRDi3C3o/ZVodudsn5G+OpXdZB8NR97SOVB/Cp2xmz47jURuJjlgtlpaR0SiDGQ1t94G/8agPNuKDTHDkuRrVOXlFxTuAzbCCyD+k8fZ+PLufdVZdQeJvU7Om3oEa4px20uApMK1KKFLT6Le+mr0O3KD6UF+M74hNLdN0uIyTJ2Hrgn/8Ah1v2lSifQpSdkH9cpqr+dceWWT5DsbT3GINoi9kS7n/SXz7+TohPwIPxqoXcknqT50oJBzHXHVnPGlsZNnN1kRV94bDnydj9xGwqPuw2HQUqUNJdDMu1XuKXobZtthQrZ+7yUHw/elof1i/cOg8yKCOrXarne7xHtVnt8mfOkK5GY0VsuOOH0CR1NWg084J8nu7LNx1EvKMfjrAV83wuV+UR6KUfYQfd7X3VZ7THSrBtKbOIuLWtPy1xARIukjZcmQfer6o/RTsPietY3VTiEwTSuM5FuMv5zvvLu3Z4Sgp0HyLquzafj19AaDw2XhY0SsUYBeIpui0j23rrIXI5vfyk8qfuqHdZ7twqYvi91slgxPHLlkxjraiizxudEd7bZKnHgrlAB8klR6bECoQ1Q4iNR9UFvQ59yNqsiz0tFuUUNEf6RX0nT+t09Eiv5pHoBmeq8lEyM380Y8FbOXeUg8q/UMp7uK+HQdNzQRZHjyJUtqLEZdffcUENttJKlrUewAHUk+gqRhw760Lsfz1/k1vBj7c2xbR4+3/UlXib+7l3q/mmGjeA6VW9CcdtSXrkU8r12lgLku+uyvqJ/RTsPXfvUj+N579aDj8G12q/JavFsdUqM8BIgyedlRAPtNq7KQSNx6irQ4Npnwu6txWmbFkN9xS9OABVolT0rdC/RtTwKXRv22PNt3Aq0OpOkuA6o29TWU2VtcwJ5WblH2alM+mzg7j9FQI91UW1d4ccy0wdeukRC79jaTum5Rm/bYHo82Nyj9YbpPrQTRdeBKOSo2TUZ1v0RcLeFn7yhSf7q0HI+CvVW0W96ZZptkv4bG4jxnlMvr/VSscp+9YrR9PuIzVTTxbLEDIXbra0bD5tupMhrl9EKJ50e7lUB7jVzdKOJvBNTAzbX3Rj+QqG3zdNcHI8r/Qu9Av4HZXuoOc91tN0sd4ftV6t0q3zmFcrsaU0ppxB96VDcV466o6j6Z4LqhaDBy+ytvPoSUsz2vycqMf0HO+36Kt0+6qHawcPWV6WyHblHKr3jfMeS5MNkKYHkH0deQ/pDdJ9aDQrBqDnWKqbON5jfLWGzzIRGmLCEn3JJIH4VYbTvjkz6wLahZ7a4uUQR0VKaAjS0j13A5F/eNz61ValB1b0+4itLtS0Nt47kbcW5r2HzZcdo0nf0SCdl/sE/dWyZJaseyKK5GyCw226NL6KTNjId3+8jf8AjXIDsQR0I7GpcwTiS1UwVLURF8N7tiNh8gu+76QPRLm/On3Dm2HpQWtyvhg0hvSnHbbbJ2OSFfXtMghtPwaXzIH4VDGRcHl7bWV43mFsmjfcNXCOqMr9pxHMD+7Up4JxTadZglqHkLisUuatgUzl88VZ/ReA2H7YSamdCGpUREqM82+wsboeaUFoV8FDoaDn1fOHPVuykr/mm5OZH9bbZCJIPwRuFn92tBuuLX+xlQvVouFsUDtyT4jsdR+5Sdv411C+TqSdwK/YSsJKSSQehB7Gg5Vm3yA3z80cj3SG9/w5t6/HyGZ5RHyPUIJFdO5uGYdcyTcsPsEwnuqRbmXCfvKd6xLuk2lzyuZenuN/swG0/wBwFBzZMSUO8Z4fFBr0221LuF0YhrmwoSXVhKpEp3lbaB+srl3VsPQJJ91dIY2l+mkRYUxp7jIUDuCq2sr/ANZJrPwbPZLT7Vss1st/ICrmjRW2eUeZ3SBsKCiFv0Fv93u7cXGIV7yWMR7dxagm1wwf0HZXVxPqQkH0BqccI4R4DbyJef3Vv5Ok8wslkcWG1f8AWyFbLc+4J9OorYM64pMIxuabTjKHcsuxcDQTDXyRkrJ2CS7seY7nb2ArrU625Ml+DHdks+C+tpCnG+/IspBUn7juPuoP3j9msmM2NmzY5aIdrt7I2RGiNhCB7zt3PvPWs/HSpZr4RYayR0rPQ4BG24oP1Ejk7dKzMePy7V/Y8YJSNxXuQjloP4hAAr6UpQKUpQKUpQKUpQKUpQKUpQKUpQKUpQKUpQKUpQKUpQKUpQKUpQKUpQfwpBHavM7HCvKvVQjegwsiAlQPSsPKtg9K29TYI7V5H2AQelBAesWiWP6tYqm23RS4c+NzKg3FtPMphR23Ck/WQrYbp9wI6iqW3o6/cON2NrXd7hFtal8rDwPym3yR5cvPuEn9D2T36HvXTiTHG/asJdbPbbvbHrZdoEadCfTyOxpLYcbWPQpPQ0FCcf4zMviBDWTYpZ7qn678VS4rn3JG6PxqSLbxj6ayGkG52LI7esj2koabkgfeFJ3r76l8FNgu7r1z01uwsclW6vmybzORSfRCxutse48w+AqpOd6W57ptcfkuYY5LgoJIblgeJHe280Op3Sfx3FBb9fGDpEhsltjJ3FeSfm5Kf4+JWFuHGthrCCLXhN8mK29lT0hplP3jYmqVdxuO1KCy9/40s7mtKax3GLFZh2S87zy3NveFEJ3+FQjmGpGc57J8XLsnn3NI+iw45ysoHoG07J/EE1q1KBvSlemBb591nog2uDImyVnlSzGbLi1H02FB5q+saNImTGokRh1+Q6oIbaaSVrWo9gkDqT7hU4YXwrah5CtuTkfgYxCJHMJX5SSR57NJPQ+5ZTVqNN9G8J0zjhdigGRc1J5XLpM2W+oeYSdtkD3JA9+/eggzSLhUcf8Ak+QaoIUy3uHGrE2r2ljy8dQ7D9AdfU+VWybVa7DYd/6JbLXBZ/RZZjtpH3BKR/8AXWsDm+d4tpxi6r7ldwEdo7pZjo9p+Sv7DaN+p9T0A7kiqK6u665RqrPVEWVWvHm18zFqZXuFbdlvK/rFfwHkPMhK2snFhNmqk4zpa+qLE6tvX4jZ13yIYB+gn9M+0fIDeqsPPOyH3H5Dq3XXFFa3HFFSlE9yonqT7zX6jx5EyY1EiMOPyHlhttppJUpaidgAB1JNXb0D4XI2MmJmWpEZqVehs7FtCtltQz3CnfJbg9OyfeewaNoDwvv30Rc01JhuR7V7L0OzuApcmDuFPDuls9CE91eewq6LDDMaM1GiMNMMNJCG2mkhCEJHYJSOgHuFeoIK1evvr1sQio9qDxttrNffwV7djWZYt3QezXr+b/Z+jQaq62seRryOIC0LbcSFoUkpUlQBCgehBB7g+lbW/b9x0TWLkQSk9qCo2tXClbrxGl5RpjGTCug3desidksSfMlnf6C/Pl+ifdVMJEeTBnOxZTLseSw4UONOJKFtrSeoIPUEGuvSmSgncVCWt/DnYdVGF3u0uM2fKkI2TM5fyUsAdEPgdfgsdR57joAr3o/xVX3FExsdz8yL1ZE7NtzweeXET267/nUD0PtdOhq41svVlyrG2rrZ5sS62qY2eV1shxtxJ7pIP4FJG/qK5f5Jjd7xDKpuOZFAcg3KG54bzK/4KB7FJHUEdCDWy6ZasZZpZkHy6wSQ7CdUPldskEliSPePqq9FjqPeNwQn3WHhYbkqkZFpeylt4kresJUEoV5ksKJ6fqE7ehFVPmQpdunvQZ8V6LJZUUOsPIKFtqHkpJ6g10k021SxPVXHjcMekFqYyB8rtkggPxj6kD6SD5LHQ+47ivlqBpNhGo8UIye07y0J5WrjFIaktj0C9jzD3KBHuoObNKsFnPCdmljcdmYdKZyKCNyGCQzKSP1T7K/2TufsioKutnu9hnrg3y1zLbJQdlMy2VNKSfTYig8VbRiOo+c4JIDmJ5PcLYnzYac5mVD0Lat0/gBWr+W9KCxVk4yNRoCUovdjx69pHTmLS4ivxbPU1v1s41MbdSlN6wK6R1/WXEmNuJ+5Kk7/AMapvSgvUxxfaRuN7yIuTsK+ym3pc/iHBWOuPGNp0whRtuOZDPV5BaW42/3kqqk1ZvGMPyjNL01asVsM67S3TslEZoqSPepX0UgeZJ2FBYO8cZ2QPc7eP4PaoiT9F6bIceWPilOyTWpx8m4g+IOSuw216VIty1cshuC0IUFv/rVj3d07kkfVNTTpZwW22B4F31TnpuMgbLFmguFLCfc66Niv4J2HvUKtTarJa7LamLVZ7dGgQWEhDUaM2G20AeQSOlBAmjPDBjunamL5flM37JE7KQ+pH5CGf9Ck9z+mevptVholt329mvXHjjmHSszFjgAdKDzxbeEgHasqzGSkdq+zbYHlX1A2oP4lIFfqlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBXzcTuO1fSv4RuKDFSWt96xMhsgnpWyONAisfIi779KDXFqKa8c5qHPgOwbhEjy4ro2cYkNpcbWPelQIP31mpEM7npWLfjKHlQQrlPDHopkqlvDFzZpCiSXrRIUxufUpPMn7gBUXXXglxha1Ls2fXaOD2alRG3AP2gdzVqnWlg9N68i210FP3OCeYlfs6ixOX3wF7/AN9eyHwXWxKwbnqDNUnzESCgE/vGrWqaWT2r8/JlE9qCCLJwraTWhaXJ0O5XtwdxOlENq+KEbf31KthxXHsYifJcasUC0tEcpTDZCCoehV9JX3k1sqIKiexr2MW0k/R/hQYluMpXTbp7qjvV3WfGdIrOG5QTcsgkN80S0tr5SQezjqvqI/ifKprYtu2xKd/8arxnvB7as4zy7ZbOz+7ty7i+XlIXHbcS2NgAhPY8oA2FBSTOM7yXUPLXshyecZMpY5W20jlajo33DbafqpH8e53rBQoUu43FiBAjOyZUhwNMsNJ5luLJ2CUgdya2TL8Hn47rLd9P7YmRdpcO4rgR/BZPiSSFbJIQN+p6dKuhw9aAx9NrajJ8pYZfyySjYJ3C0W9B+ogjoVn6yh8BQfrh84eoWm8JjK8qZalZa8jdCDspFtBH0UHzc27q8uwqwbaVLNfNlpSyKzcKDuQSKD8RIZJG4rORoe224r7RYgSBuKyLbYSO1B82o6QO1fXwk7dq+gG1KDzOMAjtWOkwwfKs1XzW2FDtQahLhkEnasS6hSD2rd5MQKHasFNhd9hQQZrVonYNXcaPOGoGRRWz8hugT9/hu7fSbJ+9PceYPOzJ8ZveHZXMxzIoLkK4xF8jrS/4KSfrJI6gjoRXWmQyps1BXEVou1qhh3zrZmEJym2NkxVdvlbfcsKP8UnyPTzoKEY7kl8xPI41+x25v2+4RlbtvsnY+8EdlJPmD0NXy0P1ztWrVuVabi01bspjNc78VHRuSgd3Wd/L1R3Hwqk2nWDv57q5acGXLNtdnSFMuPLa5yxyglW6NxuRynpuKt/h/Bo/h+aWvKbPqhIRNt76X2yLYAFbd0n8p2UNwfjQTo7GUPLpWOudntl4ifJLzbIdwY22DUthLyR8AoHb7q3h62hW/sj7q8D1sIP0f4UEGX3hv0fvqlOHFvmp1Xdy1yFsEn1IJUPwAqPbnwY4884pdmzm5xgezUuKhwJ/aB3NWoXBUD9GvkYqwexoKjDgonqV01FghPoYDm/9+1Zi3cEdq8QG7aizSkdxDgIBP3rNWiDKxX2Q2r30ERYtwoaMWB1uROtU3IH09d7pJJb39fDRsP41N9rh22z21Fus9vi2+IjomPEaS02P2UgD7687TSye1ZFiOsgdKD0IUVHavYyyVEdK/saIem4rKx4mwG4oPnHY7dKyjLewFG2ANulehKdhQfoDYUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSg/hG9fhTYIr6UoPE7FSryrwvW8KBHLWb2r8lAPlQas7awT0TXkXaQfq1uCmEnyr5mKk+VBp3zR+jX7TaO3s1tnyRIPav6IifSg1pu0gH6Ne1q2pG3s1mxHSPKvoGkgUGGVEShP0axkxPKkitmebHL0FYWZGKtxtQRZbtPMSsWd3fMbfZ2hfbq6XJNwcPO51A3Sgn6CenYd/MmtmYjqcX1BrLLgEudq9sS37EdKD5QYHQbprYI0UJA6V+o0YJSBtXuQjlFAQgJFfulKBSlKBSlKD8qSCO1eGTGCk9BWQr8qSCKDU58HoSE1rsmOUKPSpAlRgtJ6VgZkAHfpQQi1oniSOISJqzFDsW5NNueNFaADT7yk8gePorlKt9vpHYnrvvNEIcwG4ryJgEL7VmIUblIFB6kRErT1Ffh22pUDumsqw1sgbivv4aSO1BqztqBH0a8q7QPs1uCmEnyr8GKn0oNPNo/Rr9JtPX6P8ACtr+SJ9K/Qip9KDXGrVsfo1kGbeB9WsumOkeVfQNgUHkZipT5CvUhoJFfvYV/aD+bV/aUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoFKUoPypO4ryOx+avbX8I3oMZ8jTvvtX3ajBPlXs5RTag/iUgCv1SlApSlApSlApSlApSlB+VpCh2rxPRgrfpXvr+FINBifkSebfavS1GCdq9nIK/oG1B+Uo2FfulKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKBSlKD/9k=";
