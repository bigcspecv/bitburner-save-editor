import React, { Component } from "react";

import { Bitburner } from "bitburner";
import PlayerSection from "./player-section";
import FactionSection from "./factions-section";
import CompaniesSection from "./companies-section";
import ServersSection from "./servers-section";

interface Props {
  tab: Bitburner.SaveDataKey;
  isFiltering?: boolean;
}

export default class EditorSection extends Component<Props> {
  get component() {
    const { tab, ...restProps } = this.props;
    switch (tab) {
      case Bitburner.SaveDataKey.PlayerSave:
        return <PlayerSection {...restProps} />;
      case Bitburner.SaveDataKey.FactionsSave:
        return <FactionSection {...restProps} />;
      case Bitburner.SaveDataKey.CompaniesSave:
        return <CompaniesSection {...restProps} />;
      case Bitburner.SaveDataKey.AllServersSave:
        return <ServersSection {...restProps} />;
      default:
        return <div>Not Implemented</div>;
    }
  }

  render() {
    return this.component;
  }
}
