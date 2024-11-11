import { useState, useEffect, useRef } from 'react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { FaBoxOpen, FaCalendarAlt, FaClock, FaChevronDown, FaChevronUp, FaMapMarkedAlt, FaSpinner } from 'react-icons/fa';
import BottomSheet from './BottomSheet';
import { updateBranchStatus, addToPickupRoute } from '../utils/firebase';
import { translateMaterialType } from '../utils/helpers';
import { db } from '../utils/firebase';
import { doc, getDoc, serverTimestamp } from 'firebase/firestore';

export default function MapListView({ branches, handleAddToRoute, text, isRTL, language, companyNames, user }) {
  const [viewMode, setViewMode] = useState('map');
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [showBundlePrompt, setShowBundlePrompt] = useState(false);
  const [expandedCompanies, setExpandedCompanies] = useState({});
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const mapRef = useRef(null);
  const [mapCenter, setMapCenter] = useState({ lat: 24.7136, lng: 46.6753 });
  const [factoryMaterialType, setFactoryMaterialType] = useState(null);


  const MAX_BUNDLE_DISTANCE = 50; // km

  const mapContainerStyle = { 
    width: '100%', 
    height: '600px',
    borderRadius: '12px' // Add this for rounded corners
  };

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  };

  const handleMarkerClick = (branch) => {
    setSelectedBranch(branch);
  };

  const handleAddToRouteClick = (branch) => {
    console.log("Selected branch:", branch);
    // Find other branches from the same company
    const bundleBranches = branches.filter(b => 
      b.id !== branch.id && // Not the same branch
      b.companyId === branch.companyId && // Same company
      b.materialType === branch.materialType // Same material type
    );

    console.log("Found bundle branches:", bundleBranches);

    if (bundleBranches.length > 0) {
      setSelectedBranches([branch, ...bundleBranches]);
      setShowBundlePrompt(true);
      // Remove this line to prevent timing sheet from showing
      // setShowBottomSheet(true);
    } else {
      // If no bundle options, just show timing sheet
      setSelectedBranches([branch]);
      setShowBottomSheet(true);
    }
  };

  const findBundleBranches = (selectedBranch) => {
    return branches.filter(branch => 
      branch.id !== selectedBranch.id && 
      branch.companyId === selectedBranch.companyId &&
      calculateDistance(selectedBranch.location, branch.location) <= MAX_BUNDLE_DISTANCE
    );
  };

  const calculateDistance = (location1, location2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (location2.latitude - location1.latitude) * Math.PI / 180;
    const dLon = (location2.longitude - location1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(location1.latitude * Math.PI / 180) * Math.cos(location2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleBundleConfirm = (selectedBranchIds) => {
    console.log("Selected branch IDs for bundle:", selectedBranchIds);
    const selectedBranchesToAdd = branches.filter(branch => 
      selectedBranchIds.includes(branch.id)
    );
    console.log("Branches to add:", selectedBranchesToAdd);
    setSelectedBranches(selectedBranchesToAdd);
    setShowBundlePrompt(false);
    setShowBottomSheet(true); // Only show timing sheet after bundle selection
  };

  const handleBundleCancel = () => {
    setShowBundlePrompt(false);
    setSelectedBranches([]); // Clear selected branches
    // Remove this line to prevent timing sheet from showing
    // setShowBottomSheet(true);
  };


  const handleAddBranches = async (timeSlot = null) => {
    try {
      console.log("Starting handleAddBranches with timeSlot:", timeSlot);
      
      const materials = selectedBranches.map(branch => ({
        branchId: branch.id.split('_')[0],
        companyId: branch.companyId,
        materialType: branch.materialType,
        quantity: branch.quantity,
        frequency: branch.frequency
      }));
  
      // Set feedback message first
      const message = timeSlot ? text.scheduledPickupAdded : text.pendingPickupAdded;
      setFeedbackMessage(message);
  
      // Close modals
      setShowBottomSheet(false);
      setShowBundlePrompt(false);
      setSelectedBranches([]);
  
      // Perform operations
      if (timeSlot) {
        await addToPickupRoute(user.uid, materials, 'one_time', timeSlot);
        await Promise.all(
          materials.map(material => 
            updateBranchStatus(material.branchId, 'pending_branch_approval')
          )
        );
      } else {
        // Add pending info when updating status
        console.log('Updating branches with pending info');
        await Promise.all(
          materials.map(material => 
            updateBranchStatus(
              material.branchId, 
              'pending_initial_pickup',
              {
                pendingFactoryId: user.uid,
                pendingTimestamp: serverTimestamp()
              }
            )
          )
        );
      }
  
      // Delay the refresh to allow message to be visible
      setTimeout(() => {
        handleAddToRoute(null, null, null, true);
      }, 1000);
  
      // Clear message after 5 seconds
      setTimeout(() => {
        setFeedbackMessage('');
      }, 5000);
  
    } catch (error) {
      console.error("Error in handleAddBranches:", error);
      setFeedbackMessage(text.errorAddingToRoute);
      setTimeout(() => setFeedbackMessage(''), 5000);
    }
  };

  

      const toggleCompany = (companyId) => {
        setExpandedCompanies(prev => ({
          ...prev,
          [companyId]: !prev[companyId]
        }));
      };

      const getMarkerColor = (companyId) => {
        return `#${companyId.substr(0, 6)}`;
      };


 // Fetch factory's material type on component mount
 useEffect(() => {
  const fetchFactoryMaterialType = async () => {
    if (!user?.uid) return;
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      setFactoryMaterialType(userDoc.data().materialType);
    }
  };

  fetchFactoryMaterialType();
}, [user?.uid]);

// Create the supplier text based on material type
const getSupplierText = (materialType) => {
  if (!materialType) return '';
  
  const translatedMaterial = translateMaterialType(materialType, language);
  return language === 'ar' 
    ? `موردين ${translatedMaterial}` 
    : `${translatedMaterial} Suppliers`;
};


  // Only load map on initial render or when branches change
   // Modify this useEffect
   useEffect(() => {
    // Remove the mapRef.current = true line
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, [branches]);

  return (
    <div className={`space-y-4 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
   {/* Feedback message - place it here, at the very top */}
   {feedbackMessage && (
      <div 
        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 
                  bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg 
                  transition-all duration-500 ease-in-out z-[9999]"
      >
        <div className="flex flex-col items-center space-y-2">
          <div>{feedbackMessage}</div>
          <button
            onClick={() => handleAddToRoute(null, null, 'pending')}
            className="text-sm bg-green-600 hover:bg-green-700 px-4 py-1 rounded-md transition-colors duration-200 text-white"
          >
            {text.viewPendingPickups}
          </button>
        </div>
      </div>
    )}

       <h2 className="text-xl text-gray-600 mb-4">
        {getSupplierText(factoryMaterialType)}
      </h2>
    <div className="flex">
      <button
        className={`px-4 py-2 rounded ${viewMode === 'map' ? 'bg-blue-500 text-white' : 'bg-gray-200'}
          ${isRTL ? 'ml-2' : 'mr-2'}`}
        onClick={() => setViewMode('map')}
      >
        {text.mapView}
      </button>
      <button
        className={`px-4 py-2 rounded ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        onClick={() => setViewMode('list')}
      >
        {text.listView}
      </button>
    </div>

    {isLoading ? (
        <div className="mt-4 rounded-xl overflow-hidden shadow-lg"> {/* Added mt-4 to match map spacing */}
          <div className="bg-gray-100 animate-pulse h-[600px] relative"> {/* Changed height to match map height */}
            {/* Map Skeleton UI */}
            <div className="absolute inset-0 bg-gray-200">
              {/* Fake map elements */}
              <div className="absolute top-4 right-4 w-10 h-20 bg-gray-300 rounded"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <FaMapMarkedAlt className="text-gray-300 text-5xl mb-2 mx-auto" />
                  <div className="bg-gray-300 h-4 w-32 rounded mx-auto"></div>
                </div>
              </div>
              {/* Fake markers */}
              {[...Array(3)].map((_, i) => (
                <div 
                  key={i} 
                  className="absolute w-3 h-3 bg-gray-300 rounded-full transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    top: `${30 + (i * 20)}%`,
                    left: `${20 + (i * 25)}%`
                  }}
                >
                  <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-400 opacity-75"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        ) : (
        viewMode === 'map' ? (
          <div className="rounded-xl overflow-hidden shadow-lg">
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter} // Use mapCenter instead of center
              zoom={10}
              options={mapOptions}
              onLoad={(map) => {
                mapRef.current = map;
              }}
              onDragEnd={() => {
                if (mapRef.current) {
                  const newCenter = mapRef.current.getCenter();
                  setMapCenter({
                    lat: newCenter.lat(),
                    lng: newCenter.lng()
                  });
                }
              }}
            >
              {branches.map((branch) => (
                <Marker
                  key={branch.id}
                  position={{ 
                    lat: branch.location.latitude || branch.location.lat, 
                    lng: branch.location.longitude || branch.location.lng 
                  }}
                  onClick={() => handleMarkerClick(branch)}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: getMarkerColor(branch.companyId),
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: '#ffffff',
                  }}
                />
              ))}
              {selectedBranch && (
                <InfoWindow
                  position={{ 
                    lat: selectedBranch.location.latitude || selectedBranch.location.lat, 
                    lng: selectedBranch.location.longitude || selectedBranch.location.lng 
                  }}
                  onCloseClick={() => setSelectedBranch(null)}
                >
                  <div className={`p-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <h3 className="font-bold text-lg">{companyNames[selectedBranch.companyId] || text.unknownCompany}</h3>
                    <p>{text.branchName}: {selectedBranch.name}</p>
                    <p>{text.phoneNumber}: {selectedBranch.phoneNumber}</p>
                    <p>{selectedBranch.materialType} - {selectedBranch.quantity} kg</p>
                    <p>{text.frequency}: {selectedBranch.frequency}</p>
                    <button
                      className="bg-blue-500 text-white px-4 py-2 rounded mt-4 w-full"
                      onClick={() => handleAddToRouteClick(selectedBranch)}
                    >
                      {text.addToRoute}
                    </button>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </div>
        ) : (
          <ListView
            branches={branches}
            handleAddToRouteClick={handleAddToRouteClick}
            text={text}
            isRTL={isRTL}
            language={language}
            expandedCompanies={expandedCompanies}
            toggleCompany={toggleCompany}
            companyNames={companyNames}
          />
        )
      )}

       

      {showBundlePrompt && (
        <BundlePrompt
          branches={selectedBranches}
          onConfirm={handleBundleConfirm}
          onCancel={handleBundleCancel}
          text={text}
          isRTL={isRTL}
        />
      )}

{showBottomSheet && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <BottomSheet
      selectedBranches={selectedBranches}
      onAddBranches={(timeSlot) => {
        console.log("BottomSheet onAddBranches called with timeSlot:", timeSlot);
        handleAddBranches(timeSlot);
      }}
      onClose={() => {
        console.log("BottomSheet onClose called");
        setShowBottomSheet(false);
        setSelectedBranches([]);
      }}
      text={text}
      isRTL={isRTL}
    />
  </div>
)}

        
              </div>
            );
          }

function ListView({ branches, handleAddToRouteClick, text, isRTL, language, expandedCompanies, toggleCompany, companyNames }) {
  if (branches.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-lg shadow-sm">
        <FaMapMarkedAlt className="mx-auto text-gray-400 text-5xl mb-4" />
        <p className="text-gray-700 font-medium text-lg mb-2">{text.noAvailableBranches}</p>
        <p className="text-gray-500 text-sm">{text.checkBackLater}</p>
      </div>
    );
  }

  const groupedBranches = branches.reduce((acc, branch) => {
    if (!acc[branch.companyId]) {
      acc[branch.companyId] = [];
    }
    acc[branch.companyId].push(branch);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(groupedBranches).map(([companyId, companyBranches]) => (
        <div key={companyId} className="border rounded-lg overflow-hidden">
          <div
            className="bg-gray-100 p-4 flex justify-between items-center cursor-pointer"
            onClick={() => toggleCompany(companyId)}
          >
            <h3 className="font-semibold">{companyNames[companyId] || text.unknownCompany}</h3>
            {expandedCompanies[companyId] ? <FaChevronUp /> : <FaChevronDown />}
          </div>
          {expandedCompanies[companyId] && (
            <div className="p-4 space-y-4">
              {companyBranches.map((branch) => (
                <div key={branch.id} className="border p-4 rounded">
                  <h4 className="font-semibold">{branch.name || text.unknownBranch}</h4>
                  <p>{text.materialType}: {language === 'ar' ? translateMaterial(branch.materialType) : branch.materialType}</p>
                  <p>{text.estimatedQuantity}: {branch.quantity} kg</p>
                  <p>{text.frequency}: {branch.frequency}</p>
                  <button
                    onClick={() => handleAddToRouteClick(branch)}
                    className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
                  >
                    {text.addToRoute}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function translateMaterial(material) {
  // ... (keep the existing translation function)
}

function BundlePrompt({ branches, onConfirm, onCancel, text, isRTL }) {
  const [selectedBranchIds, setSelectedBranchIds] = useState([branches[0].id]);
  const initialBranch = branches[0];

  const handleCheckboxChange = (branchId) => {
    setSelectedBranchIds(prev => 
      prev.includes(branchId) 
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="relative bg-white p-6 rounded-lg w-full max-w-md">
        <button 
          onClick={onCancel}
          className="absolute top-2 right-2 p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <svg 
            className="w-6 h-6 text-gray-500" 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>

        <h2 className="text-lg font-bold mb-4 pr-8">{text.bundlePromptTitle}</h2>
        
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <p className="font-medium mb-2">{text.selectedBranch}:</p>
          <div className="flex items-center">
            <input
              type="checkbox"
              id={initialBranch.id}
              checked={true}
              disabled={true}
              className="mr-2"
            />
            <label htmlFor={initialBranch.id} className="flex-1">
              <span className="font-semibold">{initialBranch.name}</span>
              <span className="text-sm text-gray-600 block">
                {initialBranch.quantity}kg - {text.initialSelection}
              </span>
            </label>
          </div>
        </div>

        {branches.length > 1 && (
          <>
            <p className="mb-4">{text.additionalBranchesPrompt}</p>
            <div className="space-y-2 mb-4">
              {branches.slice(1).map(branch => (
                <div key={branch.id} className="flex items-center p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    id={branch.id}
                    checked={selectedBranchIds.includes(branch.id)}
                    onChange={() => handleCheckboxChange(branch.id)}
                    className="mr-2"
                  />
                  <label htmlFor={branch.id} className="flex-1 cursor-pointer">
                    <span className="font-medium">{branch.name}</span>
                    <span className="text-sm text-gray-600 block">
                      {branch.quantity}kg - {text.distance}: {branch.distance}km
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex justify-between mt-6">
          <button
            onClick={() => onConfirm([initialBranch.id])}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded"
          >
            {text.continueWithSelected}
          </button>
          <button
            onClick={() => onConfirm(selectedBranchIds)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            disabled={selectedBranchIds.length === 0}
          >
            {text.addSelected} ({selectedBranchIds.length})
          </button>
        </div>
      </div>
    </div>
  );
}


