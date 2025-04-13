import * as agGrid from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { AllCommunityModule, ModuleRegistry, provideGlobalGridOptions } from 'ag-grid-community';
import _processedData from '../data/processed.json';
import { ProcessedData } from './models';

import './main.css';

const processedData = _processedData as ProcessedData;

ModuleRegistry.registerModules([AllCommunityModule]);
provideGlobalGridOptions({
  theme: 'legacy',
});

function formatNumber(value: number, decimals: number = 0): string {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals > 0 ? decimals : 0,
    maximumFractionDigits: decimals > 0 ? decimals : 0,
  });
}

const numberFormatter: agGrid.ValueFormatterFunc = params => {
  return params.value !== null ? formatNumber(params.value) : '-';
};

const deltaFormatter: agGrid.ValueFormatterFunc = params => {
  if (params.value === null) {
    return '-';
  }

  const prefix = params.value > 0 ? '+' : '';
  return prefix + formatNumber(params.value);
};

const numberClassFunc: agGrid.CellClassFunc = params => {
  if (params.value === null) {
    return undefined;
  }

  if (params.value > 0) {
    return 'positive';
  }

  if (params.value < 0) {
    return 'negative';
  }

  return 'neutral';
};

const numberComparator: agGrid.ColDef['comparator'] = (valueA, valueB, _nodeA, _nodeB, isDescending) => {
  if (valueA === valueB) {
    return 0;
  } else if (valueA !== null && valueB !== null) {
    return valueA - valueB;
  }

  if (isDescending) {
    return valueA === null ? -1 : 1;
  } else {
    return valueA === null ? 1 : -1;
  }
};

const columns: agGrid.GridOptions['columnDefs'] = [
  {
    headerName: 'Team',
    children: [
      {
        field: '0',
        headerName: 'Name',
        filter: 'agTextColumnFilter',
        width: 180,
        pinned: 'left',
      },
      {
        field: '1',
        headerName: 'Country',
        filter: 'agTextColumnFilter',
        width: 180,
      },
    ],
  },
];

const teamColumns = 2;
const roundColumns = 8;

for (let i = processedData.rounds.length - 1; i >= 0; i--) {
  const round = processedData.rounds[i];
  const offset = teamColumns + (processedData.rounds.length - i - 1) * roundColumns;

  const children: agGrid.GridOptions['columnDefs'] = [];
  const headers = ['Rank', 'Overall', 'Manual', 'Algo'];
  for (let j = 0; j < headers.length; j++) {
    children.push({
      field: `${offset + j * 2}`,
      headerName: headers[j],
      valueFormatter: numberFormatter,
      comparator: numberComparator,
      cellClass: j > 0 ? numberClassFunc : undefined,
      sort: i === processedData.rounds.length - 1 && j === 0 ? 'asc' : undefined,
      width: 120,
    });

    children.push({
      field: `${offset + j * 2 + 1}`,
      headerName: `${headers[j]} Δ`,
      valueFormatter: deltaFormatter,
      comparator: numberComparator,
      cellClass: numberClassFunc,
      width: 120,
    });
  }

  columns.push({
    headerName: `${round.label} • ${formatNumber(round.registeredTeams)} registered teams • ${formatNumber(round.rankedTeams)} ranked teams`,
    children,
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const gridElem = document.querySelector<HTMLDivElement>('#grid')!;
  const gridOptions: agGrid.GridOptions = {
    defaultColDef: {
      sortable: true,
      resizable: false,
      suppressMovable: true,
      wrapText: true,
      autoHeight: true,
    },
    columnDefs: columns,
    rowData: processedData.rows,
    enableCellTextSelection: true,
    suppressCellFocus: true,
    cacheQuickFilter: true,
  };

  const api = agGrid.createGrid(gridElem, gridOptions);

  const searchElem = document.querySelector<HTMLInputElement>('#search')!;
  searchElem.addEventListener('input', () => {
    api.setGridOption('quickFilterText', searchElem.value);
  });

  window.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'f') {
      searchElem.focus();
      searchElem.select();
      e.preventDefault();
    }
  });
});
