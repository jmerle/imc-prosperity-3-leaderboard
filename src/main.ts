import * as agGrid from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import _processedData from '../data/processed.json';
import { ProcessedData } from './models';

import './main.css';

const processedData = _processedData as ProcessedData;

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

const firstRound = 1;
const lastRound = processedData.uniqueTeamsByRound.length;

for (let round = lastRound; round >= firstRound; round--) {
  const offset = teamColumns + (lastRound - round) * roundColumns;

  const children: agGrid.GridOptions['columnDefs'] = [];
  const headers = ['Rank', 'Overall', 'Manual', 'Algo'];
  for (let i = 0; i < headers.length; i++) {
    children.push({
      field: `${offset + i * 2}`,
      headerName: headers[i],
      valueFormatter: numberFormatter,
      comparator: numberComparator,
      cellClass: i > 0 ? numberClassFunc : undefined,
      sort: i === 0 && round === lastRound ? 'asc' : undefined,
      width: 120,
    });

    children.push({
      field: `${offset + i * 2 + 1}`,
      headerName: `${headers[i]} Δ`,
      valueFormatter: deltaFormatter,
      comparator: numberComparator,
      cellClass: numberClassFunc,
      width: 120,
    });
  }

  const uniqueTeams = processedData.uniqueTeamsByRound[round - 1];
  const rankedTeams = processedData.rankedTeamsByRound[round - 1];

  columns.push({
    headerName: `After round ${round} • ${formatNumber(uniqueTeams)} unique teams • ${formatNumber(rankedTeams)} ranked teams`,
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
