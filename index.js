document.addEventListener('DOMContentLoaded', () => {
    const itemsContainer = document.querySelector('.grid');
    const itemTemplate = document.getElementById('item-template').content;
    const dropZone = document.getElementById('drop-zone');
    
    // Modal elements
    const modal = document.getElementById('modal');
    const closeModalBtn = document.getElementById('close-modal');
    const settingsBtn = document.getElementById('settings-btn');
    const roomSettingsForm = document.getElementById('room-settings-form');
    let snapToGridEnabled = true; // Default to snap to grid being enabled

    const snapToGridToggle = document.getElementById('snap-to-grid-toggle');

    // Update snap to grid state when the checkbox is toggled
    snapToGridToggle.addEventListener('change', (e) => {
        snapToGridEnabled = e.target.checked;
    });

    // Initialize the checkbox state based on the default
    snapToGridToggle.checked = snapToGridEnabled;


    // Initial grid dimensions
    let gridDimensions = { columns: 60, rows: 40 };
    let cellSize = calculateGridCellSize();

    // Open modal when clicking on "settings"
    settingsBtn.addEventListener('click', () => {
        modal.style.display = 'flex'; // Show the modal
    });

    // Close modal when clicking the close button
    closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none'; // Hide the modal
    });

    // Close modal when clicking outside the modal content
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Handle form submission to update the room size
    roomSettingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newColumns = parseInt(document.getElementById('columns').value);
        const newRows = parseInt(document.getElementById('rows').value);
    
        // Clear the drop zone (remove all children)
        while (dropZone.firstChild) {
            dropZone.removeChild(dropZone.firstChild);
        }
    
        gridDimensions = { columns: newColumns, rows: newRows };
        cellSize = calculateGridCellSize(); // Recalculate grid cell size
        modal.style.display = 'none'; // Hide the modal after saving
    });
    

    // Fetch items from the given URL
    async function fetchItems(url) {
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Error fetching items:', error);
            return [];
        }
    }

    // Fetch and render items
    fetchItems('./items.json').then(data => {
        renderItems(data);
    });

    // Render items in the items container
    function renderItems(items) {
        items.forEach(item => {
            const itemElement = createItemElement(item);
            itemsContainer.appendChild(itemElement);
        });
    }

    // Create a DOM element for a given item
    function createItemElement(item) {
        const itemClone = document.importNode(itemTemplate, true); // Clone the template
        const imageDiv = itemClone.querySelector('.size-32');

        // Set item name and size
        itemClone.querySelector('span').textContent = `${item.size[0]}x${item.size[1]}`;
        itemClone.querySelector('p').textContent = item.name;

        // Create and configure the image element
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.name;
        img.classList.add('w-full', 'h-full', 'object-cover');
        img.draggable = false; // Disable dragging on the image

        imageDiv.appendChild(img); // Append image to the div

        // Make the item draggable
        const draggableItem = itemClone.querySelector('div');
        draggableItem.draggable = true; // Set draggable attribute

        // Attach drag event listeners
        draggableItem.addEventListener('dragstart', (e) => handleDragStart(e, item));

        return itemClone; // Return the created item element
    }

    // Handle the drag start event
    function handleDragStart(e, item) {
        e.dataTransfer.setData('text/plain', JSON.stringify(item)); // Store item data
    }

    // Calculate the size of each grid cell based on drop zone width
    function calculateGridCellSize() {
        const availableWidth = window.innerWidth * 0.7;  // 80% of the window width, leaving some space for padding
        const availableHeight = window.innerHeight * 0.8; // 80% of the window height for a balanced size
    
        // Calculate the maximum cell size based on the available dimensions
        const cellWidth = availableWidth / gridDimensions.columns;
        const cellHeight = availableHeight / gridDimensions.rows;
    
        // Use the smaller of the two dimensions to ensure the grid fits in both width and height
        const size = Math.min(cellWidth, cellHeight);
    
        // Set the width and height of the drop zone based on the calculated cell size
        dropZone.style.width = `${size * gridDimensions.columns}px`;  // Width based on columns
        dropZone.style.height = `${size * gridDimensions.rows}px`;    // Height based on rows
    
        return size;
    }
    
    

    // Snapping logic to ensure the item can be positioned at right and bottom edges
    function getSnappedPosition(clientX, clientY, itemWidth, itemHeight) {
        const mouseX = clientX - dropZone.offsetLeft;
        const mouseY = clientY - dropZone.offsetTop;
    
        let snappedX = mouseX;
        let snappedY = mouseY;
    
        if (snapToGridEnabled) {
            // Snap to grid if the toggle is enabled
            snappedX = Math.floor(mouseX / cellSize) * cellSize;
            snappedY = Math.floor(mouseY / cellSize) * cellSize;
        }
    
        // Ensure items can be placed all the way to the right and bottom by checking bounds
        const maxX = dropZone.offsetWidth - itemWidth;
        const maxY = dropZone.offsetHeight - itemHeight;
    
        // Adjust snappedX and snappedY to ensure they don't exceed the bounds and allow placement at 0
        snappedX = Math.max(0, Math.min(snappedX, maxX));  // Ensure it includes position 0 for left edge
        snappedY = Math.max(0, Math.min(snappedY, maxY));  // Ensure it includes position 0 for top edge
    
        return [snappedX, snappedY];
    }
    
    


    // Example of how to use getSnappedPosition during a drop event
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault(); // Allow drop
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        const droppedItemData = JSON.parse(e.dataTransfer.getData('text/plain'));
        const itemWidth = droppedItemData.size[0] * cellSize;
        const itemHeight = droppedItemData.size[1] * cellSize;

        const [snappedX, snappedY] = getSnappedPosition(e.clientX, e.clientY, itemWidth, itemHeight);

        // Now snappedX and snappedY will ensure items can go all the way to the edges
        const droppedElement = createDroppedItemElement(droppedItemData, snappedX, snappedY);
        dropZone.appendChild(droppedElement);
        makeItemMovable(droppedElement, droppedItemData.size); // Make it movable
    });

    // Create the dropped item element
    function createDroppedItemElement(itemData, snappedX, snappedY) {
        const droppedElement = document.createElement('div');
        droppedElement.classList.add('absolute', 'draggable-item'); // Add class for styling
        droppedElement.style.left = `${snappedX}px`;
        droppedElement.style.top = `${snappedY}px`;
        droppedElement.style.width = `${itemData.size[0] * cellSize}px`; // Set width
        droppedElement.style.height = `${itemData.size[1] * cellSize}px`; // Set height
    
        const img = document.createElement('img');
        img.src = itemData.image;
        img.alt = itemData.name;
        img.classList.add('w-full', 'h-full', 'object-cover');
        img.draggable = false; // Disable dragging on the dropped image
    
        // Add event listener for Shift+Click to remove the item
        droppedElement.addEventListener('click', (e) => {
            if (e.shiftKey) {
                // Remove the item from the drop zone
                droppedElement.remove();
            }
        });
    
        droppedElement.appendChild(img);
        return droppedElement;
    }
    

    // Make the dropped item movable within the drop zone
    function makeItemMovable(item, size) {
        let activeItem = null; // Track active item
        let offsetX = 0;
        let offsetY = 0;

        item.addEventListener('mousedown', (e) => {
            activeItem = item; // Set the active item
            offsetX = e.clientX - item.offsetLeft; // Calculate offset
            offsetY = e.clientY - item.offsetTop; // Calculate offset

            item.classList.add('moving'); // Add moving class for feedback
        });

        document.addEventListener('mousemove', (e) => {
            if (activeItem) {
                const [snappedX, snappedY] = getSnappedPosition(e.clientX, e.clientY, size[0] * cellSize, size[1] * cellSize);
                const dropZoneRect = dropZone.getBoundingClientRect(); // Get drop zone dimensions

                // Keep item within the drop zone bounds
                const itemWidth = size[0] * cellSize;
                const itemHeight = size[1] * cellSize;

                if (snappedX >= 0 && snappedX + itemWidth <= dropZoneRect.width) {
                    activeItem.style.left = `${snappedX}px`; // Set X position
                }
                if (snappedY >= 0 && snappedY + itemHeight <= dropZoneRect.height) {
                    activeItem.style.top = `${snappedY}px`; // Set Y position
                }
            }
        });

        document.addEventListener('mouseup', () => {
            if (activeItem) {
                activeItem.classList.remove('moving'); // Remove moving class
                activeItem = null; // Reset active item
            }
        });
    }

    // Update cell size on window resize
    window.addEventListener('resize', () => {
        cellSize = calculateGridCellSize(); // Recalculate cell size when window is resized
    });

    document.getElementById('calculate-area').addEventListener('click', () => {
        const occupiedCells = new Set(); // To track unique grid cells
        const itemCounts = {}; // To track how many of each item is placed
    
        // Loop over all items in the drop zone
        document.querySelectorAll('.draggable-item').forEach(item => {
            const itemLeft = parseInt(item.style.left, 10);
            const itemTop = parseInt(item.style.top, 10);
            const itemWidth = parseInt(item.style.width, 10);
            const itemHeight = parseInt(item.style.height, 10);
            const itemName = item.querySelector('img').alt; // Get item name from image alt attribute
    
            // Track how many times each item has been placed
            if (!itemCounts[itemName]) {
                itemCounts[itemName] = 0;
            }
            itemCounts[itemName] += 1;
    
            // Calculate how many grid cells this item covers
            const startX = Math.floor(itemLeft / cellSize);
            const startY = Math.floor(itemTop / cellSize);
            const endX = Math.ceil((itemLeft + itemWidth) / cellSize);
            const endY = Math.ceil((itemTop + itemHeight) / cellSize);
    
            // Loop through all the cells this item occupies
            for (let x = startX; x < endX; x++) {
                for (let y = startY; y < endY; y++) {
                    occupiedCells.add(`${x},${y}`); // Add unique cell positions to the Set
                }
            }
        });
    
        const totalArea = gridDimensions.columns * gridDimensions.rows; // Total number of grid cells
        const coveredArea = occupiedCells.size; // Number of unique grid cells covered by items
    
        // Generate the table content
        const areaTable = document.getElementById('area-table');
        areaTable.innerHTML = ''; // Clear previous table content
    
        // Add rows for total grid spaces and covered grid spaces
        areaTable.innerHTML += `
            <tr>
                <td class="border p-2 font-bold">Total Grid Spaces</td>
                <td class="border p-2">${totalArea}</td>
            </tr>
            <tr>
                <td class="border p-2 font-bold">Grid Spaces Covered</td>
                <td class="border p-2">${coveredArea}</td>
            </tr>
        `;
    
        // Add rows for each item and how many of each were placed
        Object.keys(itemCounts).forEach(itemName => {
            areaTable.innerHTML += `
                <tr>
                    <td class="border p-2">${itemName}</td>
                    <td class="border p-2">${itemCounts[itemName]}</td>
                </tr>
            `;
        });
    
        // Show the modal
        const areaModal = document.getElementById('area-modal');
        areaModal.classList.add('active');
    });
    
    // Close the modal when clicking the close button
    document.getElementById('close-area-modal').addEventListener('click', () => {
        document.getElementById('area-modal').classList.remove('active');
    });
    
    document.getElementById('close-area-modal-btn').addEventListener('click', () => {
        document.getElementById('area-modal').classList.remove('active');
    });
    
    // Handle the "Reload Items" button click
    document.getElementById('reload-items').addEventListener('click', () => {
        reloadItems(); // Call the function to reload items
    });

    // Function to reload items
    function reloadItems() {
        // Clear the existing items in the grid
        const itemsContainer = document.querySelector('.grid');
        itemsContainer.innerHTML = ''; // Clear the current items

        // Re-fetch the items and render them again
        fetchItems('./items.json').then(data => {
            renderItems(data);
        });
    }

});

